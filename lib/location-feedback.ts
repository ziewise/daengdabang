export function locationFailureMessage(code: number, native: boolean, recovery?: string): string {
    if (code === 1) {
        if (!native) return "위치 권한이 꺼져 있어요. 브라우저의 사이트 설정에서 위치를 허용한 뒤 다시 찾아주세요.";
        if (recovery === "permission") return "가까운 곳을 찾으려면 위치 허용이 필요해요. 아래 ‘위치 허용하고 다시 찾기’를 누르고 ‘앱 사용 중 허용’을 선택해 주세요.";
        return "위치 권한 요청이 차단되어 있어요. 휴대폰 설정 → 앱 → 댕다방 → 권한 → 위치에서 ‘앱 사용 중 허용’을 선택해 주세요.";
    }
    if (code === 2) return "현재 위치를 확인하지 못했어요. 휴대폰의 위치 기능을 켠 뒤 다시 찾아주세요.";
    if (code === 3) return "위치를 찾는 데 시간이 걸리고 있어요. 잠시 후 다시 찾거나 네이버지도에서 확인해 주세요.";
    return "주변 후보를 불러오지 못했어요. 잠시 후 다시 찾거나 네이버지도에서 확인해 주세요.";
}
