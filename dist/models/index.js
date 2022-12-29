"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMethodType = exports.CapabilityProtocolPrefix = exports.AuthStatus = void 0;
var AuthStatus;
(function (AuthStatus) {
    AuthStatus["InProgress"] = "InProgress";
    AuthStatus["Succeeded"] = "Succeeded";
    AuthStatus["Failed"] = "Failed";
})(AuthStatus = exports.AuthStatus || (exports.AuthStatus = {}));
var CapabilityProtocolPrefix;
(function (CapabilityProtocolPrefix) {
    CapabilityProtocolPrefix["LitEncryptionCondition"] = "litEncryptionCondition";
    CapabilityProtocolPrefix["LitSigningCondition"] = "litSigningCondition";
})(CapabilityProtocolPrefix = exports.CapabilityProtocolPrefix || (exports.CapabilityProtocolPrefix = {}));
var AuthMethodType;
(function (AuthMethodType) {
    AuthMethodType[AuthMethodType["EthWallet"] = 1] = "EthWallet";
    AuthMethodType[AuthMethodType["LitAction"] = 2] = "LitAction";
    AuthMethodType[AuthMethodType["WebAuthn"] = 3] = "WebAuthn";
    AuthMethodType[AuthMethodType["Discord"] = 4] = "Discord";
    AuthMethodType[AuthMethodType["Google"] = 5] = "Google";
    AuthMethodType[AuthMethodType["GoogleJwt"] = 6] = "GoogleJwt";
})(AuthMethodType = exports.AuthMethodType || (exports.AuthMethodType = {}));
//# sourceMappingURL=index.js.map