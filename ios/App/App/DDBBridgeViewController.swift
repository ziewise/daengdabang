import Capacitor

final class DDBBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(OnDeviceTryOnPlugin())
    }
}
