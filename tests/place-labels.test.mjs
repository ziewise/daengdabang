import assert from "node:assert/strict";
import test from "node:test";
import { placeDisplayAddress, placeDisplayName } from "../lib/place-labels.ts";
import { placeMapLinks } from "../lib/place-map-links.ts";

test("English display follows road-address order and maps search the registered name", () => {
    const place = { name: "강남동물병원", address: "서울특별시 강남구 강남대로10길 109" };
    assert.equal(placeDisplayAddress(place.address, "en"), "109, Gangnam-daero 10-gil, Gangnam-gu, Seoul");
    assert.equal(placeDisplayName(place.name, "en"), "Gangnam Animal Hospital");
    assert.equal(placeDisplayName(place.name, "ko"), place.name);
    assert.equal(placeDisplayAddress(place.address, "ko"), place.address);
    assert.match(decodeURIComponent(placeMapLinks(place).naver), /강남동물병원/);
    assert.equal(placeDisplayName("ABC Pet Care", "en"), "ABC Pet Care");
});
