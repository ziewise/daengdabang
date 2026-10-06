import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("login sends the exact password used by signup and password reset", async () => {
    const source = readFileSync("app/auth/login/page.tsx", "utf8");
    const call = source.match(/await loginCustomer\((\{[^;]+?\})\);/);
    assert.ok(call, "login API call must be present");
    const enteredPassword = "  Correct horse battery staple  ";
    let submitted;
    await vm.runInNewContext(`loginCustomer(${call[1]})`, {
        email: " qa-login@example.invalid ",
        password: enteredPassword,
        loginCustomer: async (payload) => { submitted = payload; },
    });
    assert.equal(submitted.email, "qa-login@example.invalid");
    assert.equal(submitted.password, enteredPassword);
});
