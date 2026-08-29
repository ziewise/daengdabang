import Capacitor
import CryptoKit
import Foundation
import ImageIO
import OnnxRuntimeBindings
import UIKit

@objc(OnDeviceTryOnPlugin)
public final class OnDeviceTryOnPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OnDeviceTryOnPlugin"
    public let jsName = "OnDeviceTryOn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "run", returnType: CAPPluginReturnPromise),
    ]

    private let modelName = "ddb-lite-tryon-compositor-v2"
    private let modelDigest = "3d09e7795872e60f381f02bce0993c2be6ca75fa5530f64ad50979f6315b9eea"
    private let edge = 256
    private let maxDataUrlCharacters = 14_000_000
    private let maxDecodedImageBytes = 10_000_000
    private let queue = DispatchQueue(label: "com.daengdabang.tryon.coreml", qos: .userInitiated)

    @objc public func getCapabilities(_ call: CAPPluginCall) {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let path = modelPath()
        let digest = path.flatMap(fileDigest) ?? ""
        let battery = UIDevice.current.batteryLevel
        call.resolve([
            "available": ORTIsCoreMLExecutionProviderAvailable() && digest == modelDigest,
            "provider": "coreml",
            "runtimeVersion": String(describing: ORTVersion()),
            "modelAvailable": digest == modelDigest,
            "modelSha256": digest,
            "totalMemoryMb": ProcessInfo.processInfo.physicalMemory / 1024 / 1024,
            "batteryLevel": battery,
            "charging": UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full,
            "powerSaveMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
            "thermalState": thermalState(),
            "reason": digest == modelDigest ? "" : "model_integrity_failed",
        ])
    }

    @objc public func run(_ call: CAPPluginCall) {
        guard call.getString("modelSha256") == modelDigest,
              let path = modelPath(), fileDigest(path) == modelDigest else {
            call.reject("model_integrity_failed", "MODEL_INTEGRITY_FAILED")
            return
        }
        guard ORTIsCoreMLExecutionProviderAvailable() else {
            call.reject("runtime_unavailable", "COREML_UNAVAILABLE")
            return
        }
        guard let petDataUrl = call.getString("petDataUrl"),
              let productDataUrl = call.getString("productDataUrl"),
              let pet = decodeDataUrl(petDataUrl),
              let product = decodeDataUrl(productDataUrl) else {
            call.reject("invalid_image_data_url", "INVALID_IMAGE")
            return
        }
        let layout = call.getString("layout") ?? "torso"
        queue.async { [weak self] in
            guard let self else { return }
            let started = Date()
            do {
                let prepared = try self.prepare(pet: pet, product: product, layout: layout)
                let output = try self.infer(path: path, prepared: prepared)
                let image = try self.outputImage(output)
                guard let jpeg = image.jpegData(compressionQuality: 0.88) else {
                    throw TryOnError.render
                }
                call.resolve([
                    "imageDataUrl": "data:image/jpeg;base64,\(jpeg.base64EncodedString())",
                    "provider": "coreml",
                    "runtimeVersion": String(describing: ORTVersion()),
                    "durationMs": Date().timeIntervalSince(started) * 1000,
                    "modelSha256": self.modelDigest,
                ])
            } catch {
                call.reject("inference_failed", "ON_DEVICE_INFERENCE_FAILED", error)
            }
        }
    }

    private func infer(path: String, prepared: Prepared) throws -> [Float32] {
        let environment = try ORTEnv(loggingLevel: .warning)
        let options = try ORTSessionOptions()
        try options.setIntraOpNumThreads(1)
        let coreML = ORTCoreMLExecutionProviderOptions()
        coreML.enableOnSubgraphs = true
        try options.appendCoreMLExecutionProvider(with: coreML)
        let session = try ORTSession(env: environment, modelPath: path, sessionOptions: options)
        let rgbShape: [NSNumber] = [1, 3, NSNumber(value: edge), NSNumber(value: edge)]
        let alphaShape: [NSNumber] = [1, 1, NSNumber(value: edge), NSNumber(value: edge)]
        let inputs = [
            "pet_rgb": try tensor(prepared.petRGB, shape: rgbShape),
            "product_rgb": try tensor(prepared.productRGB, shape: rgbShape),
            "alpha": try tensor(prepared.alpha, shape: alphaShape),
        ]
        let outputs = try session.run(withInputs: inputs, outputNames: ["result_rgb"], runOptions: nil)
        guard let value = outputs["result_rgb"] else { throw TryOnError.inference }
        let data = try value.tensorData() as Data
        return data.withUnsafeBytes { Array($0.bindMemory(to: Float32.self)) }
    }

    private func tensor(_ values: [Float32], shape: [NSNumber]) throws -> ORTValue {
        let data = values.withUnsafeBufferPointer { Data(buffer: $0) }
        return try ORTValue(
            tensorData: NSMutableData(data: data),
            elementType: .float,
            shape: shape)
    }

    private func prepare(pet: UIImage, product: UIImage, layout: String) throws -> Prepared {
        let petImage = render(size: CGSize(width: edge, height: edge), opaque: true) { context in
            UIColor(red: 245/255, green: 245/255, blue: 244/255, alpha: 1).setFill()
            context.fill(CGRect(x: 0, y: 0, width: edge, height: edge))
            drawContained(pet, in: CGRect(x: 0, y: 0, width: edge, height: edge))
        }
        let productImage = render(size: CGSize(width: edge, height: edge), opaque: false) { _ in
            for rect in layoutRects(layout) { drawContained(product, in: rect) }
        }
        let petPixels = try rgba(petImage)
        let productPixels = try rgba(productImage)
        let plane = edge * edge
        var petRGB = [Float32](repeating: 0, count: plane * 3)
        var productRGB = [Float32](repeating: 0, count: plane * 3)
        var alpha = [Float32](repeating: 0, count: plane)
        for index in 0..<plane {
            let pixel = index * 4
            for channel in 0..<3 {
                petRGB[channel * plane + index] = Float32(petPixels[pixel + channel]) / 255
                productRGB[channel * plane + index] = Float32(productPixels[pixel + channel]) / 255
            }
            let whiteness = Float32(min(productPixels[pixel], min(productPixels[pixel + 1], productPixels[pixel + 2]))) / 255
            let whiteSuppression = max(0, 1 - max(0, whiteness - 0.9) * 10)
            alpha[index] = Float32(productPixels[pixel + 3]) / 255 * whiteSuppression * 0.82
        }
        return Prepared(petRGB: petRGB, productRGB: productRGB, alpha: alpha)
    }

    private func outputImage(_ values: [Float32]) throws -> UIImage {
        let plane = edge * edge
        guard values.count == plane * 3 else { throw TryOnError.render }
        var pixels = [UInt8](repeating: 255, count: plane * 4)
        for index in 0..<plane {
            pixels[index * 4] = byte(values[index])
            pixels[index * 4 + 1] = byte(values[plane + index])
            pixels[index * 4 + 2] = byte(values[plane * 2 + index])
        }
        let data = Data(pixels) as CFData
        guard let provider = CGDataProvider(data: data),
              let cgImage = CGImage(
                width: edge, height: edge, bitsPerComponent: 8, bitsPerPixel: 32,
                bytesPerRow: edge * 4, space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
                provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent) else {
            throw TryOnError.render
        }
        return UIImage(cgImage: cgImage)
    }

    private func rgba(_ image: UIImage) throws -> [UInt8] {
        guard let cgImage = image.cgImage else { throw TryOnError.render }
        var bytes = [UInt8](repeating: 0, count: edge * edge * 4)
        guard let context = CGContext(
            data: &bytes, width: edge, height: edge, bitsPerComponent: 8,
            bytesPerRow: edge * 4, space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { throw TryOnError.render }
        context.translateBy(x: 0, y: CGFloat(edge))
        context.scaleBy(x: 1, y: -1)
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: edge, height: edge))
        return bytes
    }

    private func render(size: CGSize, opaque: Bool, actions: (CGContext) -> Void) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.opaque = opaque
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { renderer in actions(renderer.cgContext) }
    }

    private func drawContained(_ image: UIImage, in target: CGRect) {
        let scale = min(target.width / image.size.width, target.height / image.size.height)
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        image.draw(in: CGRect(x: target.midX - size.width / 2, y: target.midY - size.height / 2, width: size.width, height: size.height))
    }

    private func layoutRects(_ layout: String) -> [CGRect] {
        switch layout {
        case "head": return [CGRect(x: 54, y: 18, width: 150, height: 94)]
        case "neck": return [CGRect(x: 78, y: 62, width: 106, height: 58)]
        case "feet": return [CGRect(x: 43, y: 185, width: 42, height: 52), CGRect(x: 87, y: 188, width: 42, height: 52), CGRect(x: 135, y: 188, width: 42, height: 52), CGRect(x: 177, y: 184, width: 42, height: 52)]
        case "leash": return [CGRect(x: 62, y: 55, width: 158, height: 132)]
        case "harness": return [CGRect(x: 56, y: 63, width: 154, height: 120)]
        default: return [CGRect(x: 48, y: 55, width: 166, height: 132)]
        }
    }

    private func decodeDataUrl(_ value: String) -> UIImage? {
        guard value.count <= maxDataUrlCharacters,
              value.hasPrefix("data:image/"), let comma = value.firstIndex(of: ","),
              let data = Data(base64Encoded: String(value[value.index(after: comma)...])),
              data.count <= maxDecodedImageBytes,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 2048,
              ] as CFDictionary) else { return nil }
        return UIImage(cgImage: image)
    }

    private func modelPath() -> String? {
        Bundle.main.path(forResource: modelName, ofType: "onnx", inDirectory: "public/ai/tryon")
    }

    private func fileDigest(_ path: String) -> String? {
        guard let data = try? Data(contentsOf: URL(fileURLWithPath: path), options: .mappedIfSafe) else { return nil }
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private func byte(_ value: Float32) -> UInt8 { UInt8((max(0, min(1, value)) * 255).rounded()) }

    private func thermalState() -> String {
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: return "nominal"
        case .fair: return "fair"
        case .serious: return "serious"
        case .critical: return "critical"
        @unknown default: return "unknown"
        }
    }
}

private struct Prepared {
    let petRGB: [Float32]
    let productRGB: [Float32]
    let alpha: [Float32]
}

private enum TryOnError: Error { case inference, render }
