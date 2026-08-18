export const DELIVERY_POLICY = {
    baseFeeKrw: 3_000,
    freeThresholdKrw: 30_000,
    jejuSurchargeKrw: 3_000,
    islandSurchargeKrw: 5_000,
    dispatch: "결제 확인 후 1~2영업일 이내 출고",
    arrival: "결제 후 최대 7일 이내 도착",
    carriers: "한진택배 또는 CJ대한통운",
} as const;

export const RETURN_POLICY = {
    designatedCarrier: "CJ대한통운",
    oneWayFeeKrw: 3_000,
    freeInitialShippingReturnFeeKrw: 6_000,
    exchangeFeeKrw: 6_000,
    address: "충청남도 천안시 서북구 한들2로 150 (한화 포레나 천안노태 2단지) 204동 701호 (우: 31088)",
} as const;

export const RETURN_EXCLUSION_REASONS = [
    "반품 요청기간이 지난 경우",
    "구매자의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우(단, 상품의 내용을 확인하기 위하여 포장 등을 훼손한 경우는 제외)",
    "구매자의 책임 있는 사유로 포장이 훼손되어 상품 가치가 현저히 상실된 경우(예: 식품, 화장품, 향수류, 음반 등)",
    "구매자의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우(라벨이 떨어진 의류 또는 태그가 떨어진 명품관 상품인 경우)",
    "시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우",
    "고객의 요청사항에 맞춰 제작에 들어가는 맞춤제작상품으로, 판매자에게 회복할 수 없는 중대한 피해가 예상되고 그 사실을 사전에 알린 뒤 서면 동의를 받은 경우",
    "복제가 가능한 상품 등의 포장을 훼손한 경우(CD/DVD/GAME/도서의 경우 포장 개봉 시)",
] as const;
