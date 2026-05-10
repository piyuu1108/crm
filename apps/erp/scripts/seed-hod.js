"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var serverless_1 = require("@neondatabase/serverless");
var neon_http_1 = require("drizzle-orm/neon-http");
var schema = require("../app/lib/schema");
var bcryptjs_1 = require("bcryptjs");
var fs_1 = require("fs");
var path_1 = require("path");
var drizzle_orm_1 = require("drizzle-orm");
// Load .env manually to ensure DATABASE_URL is available
var envPath = path_1.default.resolve(process.cwd(), ".env");
if (fs_1.default.existsSync(envPath)) {
    var envContent = fs_1.default.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(function (line) {
        var parts = line.split("=");
        if (parts.length >= 2) {
            var key = parts[0];
            var value = parts.slice(1).join("=").trim();
            // Strip surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            if (key && value && !process.env[key]) {
                process.env[key.trim()] = value;
            }
        }
    });
}
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}
var sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
var db = (0, neon_http_1.drizzle)(sql, { schema: schema });
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var rolesToInsert, _i, rolesToInsert_1, roleName, existing, allRoles, hodRole, facultyRole, studentRole, counselorRole, hodEmail, hodPassword, hodFacultyCode, hodName, existingHod, hodId, hashedPassword, newHod, rolesToAssign, _loop_1, _a, rolesToAssign_1, rId, facultyUsers, defaultPassword, _b, facultyUsers_1, user, existing, facultyId, hashedPassword, newFaculty, existingRoles;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("Seeding database...");
                    rolesToInsert = ["student", "faculty", "counselor", "hod"];
                    _i = 0, rolesToInsert_1 = rolesToInsert;
                    _c.label = 1;
                case 1:
                    if (!(_i < rolesToInsert_1.length)) return [3 /*break*/, 6];
                    roleName = rolesToInsert_1[_i];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema.roles)
                            .where((0, drizzle_orm_1.eq)(schema.roles.name, roleName))];
                case 2:
                    existing = _c.sent();
                    if (!(existing.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, db.insert(schema.roles).values({ name: roleName })];
                case 3:
                    _c.sent();
                    console.log("Role '".concat(roleName, "' created."));
                    return [3 /*break*/, 5];
                case 4:
                    console.log("Role '".concat(roleName, "' already exists."));
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [4 /*yield*/, db.select().from(schema.roles)];
                case 7:
                    allRoles = _c.sent();
                    hodRole = allRoles.find(function (r) { return r.name === "hod"; });
                    facultyRole = allRoles.find(function (r) { return r.name === "faculty"; });
                    studentRole = allRoles.find(function (r) { return r.name === "student"; });
                    counselorRole = allRoles.find(function (r) { return r.name === "counselor"; });
                    if (!hodRole || !facultyRole || !studentRole || !counselorRole) {
                        throw new Error("Roles were not seeded correctly");
                    }
                    hodEmail = "hod@college.edu";
                    hodPassword = "password123";
                    hodFacultyCode = "HOD001";
                    hodName = "System Admin HOD";
                    return [4 /*yield*/, db
                            .select()
                            .from(schema.faculty)
                            .where((0, drizzle_orm_1.eq)(schema.faculty.email, hodEmail))];
                case 8:
                    existingHod = _c.sent();
                    if (!(existingHod.length === 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, bcryptjs_1.default.hash(hodPassword, 10)];
                case 9:
                    hashedPassword = _c.sent();
                    return [4 /*yield*/, db.insert(schema.faculty).values({
                            facultyCode: hodFacultyCode,
                            name: hodName,
                            email: hodEmail,
                            mobile: "9999999999",
                            passwordHash: hashedPassword,
                            mustChangePwd: true,
                            designation: "Head of Department",
                            isActive: true,
                        }).returning({ id: schema.faculty.id })];
                case 10:
                    newHod = (_c.sent())[0];
                    hodId = newHod.id;
                    console.log("HOD account created (Email: ".concat(hodEmail, ", Password: ").concat(hodPassword, ")"));
                    return [3 /*break*/, 12];
                case 11:
                    hodId = existingHod[0].id;
                    console.log("HOD account '".concat(hodEmail, "' already exists."));
                    _c.label = 12;
                case 12:
                    rolesToAssign = [hodRole.id, facultyRole.id, studentRole.id, counselorRole.id];
                    _loop_1 = function (rId) {
                        var existingRoleMapping, userRoles;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0: return [4 /*yield*/, db
                                        .select()
                                        .from(schema.facultyRoles)
                                        .where((0, drizzle_orm_1.eq)(schema.facultyRoles.facultyId, hodId))
                                    // Workaround: We have to manually filter in JS if multi-column where is tricky, 
                                    // but let's just use raw filtering or multiple eq clauses if needed.
                                    // Drizzle supports it: and(eq(a, b), eq(c, d))
                                    // But since we are iterating, we can just fetch all mappings for this user
                                    // and check in memory.
                                ];
                                case 1:
                                    existingRoleMapping = _d.sent();
                                    return [4 /*yield*/, db
                                            .select()
                                            .from(schema.facultyRoles)
                                            .where((0, drizzle_orm_1.eq)(schema.facultyRoles.facultyId, hodId))];
                                case 2:
                                    userRoles = _d.sent();
                                    if (!!userRoles.find(function (ur) { return ur.roleId === rId; })) return [3 /*break*/, 4];
                                    return [4 /*yield*/, db.insert(schema.facultyRoles).values({
                                            facultyId: hodId,
                                            roleId: rId,
                                        })];
                                case 3:
                                    _d.sent();
                                    console.log("Role mapping added for HOD (Role ID: ".concat(rId, ")"));
                                    return [3 /*break*/, 5];
                                case 4:
                                    console.log("Role mapping already exists for HOD (Role ID: ".concat(rId, ")"));
                                    _d.label = 5;
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, rolesToAssign_1 = rolesToAssign;
                    _c.label = 13;
                case 13:
                    if (!(_a < rolesToAssign_1.length)) return [3 /*break*/, 16];
                    rId = rolesToAssign_1[_a];
                    return [5 /*yield**/, _loop_1(rId)];
                case 14:
                    _c.sent();
                    _c.label = 15;
                case 15:
                    _a++;
                    return [3 /*break*/, 13];
                case 16:
                    facultyUsers = [
                        { name: "Priyanka Chauhan", email: "priyankachauhan@gmail.com", code: "FAC002" },
                        { name: "Kajal Bhanushali", email: "kajalbhanushali@gmail.com", code: "FAC003" },
                        { name: "Priya Sharma", email: "priyasharma@gmail.com", code: "FAC004" },
                        { name: "Bhavin Rabbari", email: "bhavinrabbari@gmail.com", code: "FAC005" },
                        { name: "Amit Patel", email: "amitpatel@gmail.com", code: "FAC006" },
                        { name: "Hinal Rabbari", email: "hinalrabbari@gmail.com", code: "FAC007" },
                        { name: "Sherya Patel", email: "sheryapatel@gmail.com", code: "FAC008" },
                        { name: "Krishna Patel", email: "krishnapatel@gmail.com", code: "FAC009" },
                        { name: "Nidhi Patel", email: "nidhipatel@gmail.com", code: "FAC010" },
                        { name: "Rinkal Patel", email: "rinkalpatel@gmail.com", code: "FAC011" },
                    ];
                    defaultPassword = "pass@123";
                    _b = 0, facultyUsers_1 = facultyUsers;
                    _c.label = 17;
                case 17:
                    if (!(_b < facultyUsers_1.length)) return [3 /*break*/, 26];
                    user = facultyUsers_1[_b];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema.faculty)
                            .where((0, drizzle_orm_1.eq)(schema.faculty.email, user.email))];
                case 18:
                    existing = _c.sent();
                    facultyId = void 0;
                    if (!(existing.length === 0)) return [3 /*break*/, 21];
                    return [4 /*yield*/, bcryptjs_1.default.hash(defaultPassword, 10)];
                case 19:
                    hashedPassword = _c.sent();
                    return [4 /*yield*/, db.insert(schema.faculty).values({
                            facultyCode: user.code,
                            name: user.name,
                            email: user.email,
                            mobile: "9999999999",
                            passwordHash: hashedPassword,
                            mustChangePwd: true,
                            designation: "Assistant Professor",
                            isActive: true,
                        }).returning({ id: schema.faculty.id })];
                case 20:
                    newFaculty = (_c.sent())[0];
                    facultyId = newFaculty.id;
                    console.log("Created: ".concat(user.email, " / ").concat(defaultPassword));
                    return [3 /*break*/, 22];
                case 21:
                    facultyId = existing[0].id;
                    console.log("Already exists: ".concat(user.email));
                    _c.label = 22;
                case 22: return [4 /*yield*/, db
                        .select()
                        .from(schema.facultyRoles)
                        .where((0, drizzle_orm_1.eq)(schema.facultyRoles.facultyId, facultyId))];
                case 23:
                    existingRoles = _c.sent();
                    if (!!existingRoles.find(function (r) { return r.roleId === facultyRole.id; })) return [3 /*break*/, 25];
                    return [4 /*yield*/, db.insert(schema.facultyRoles).values({
                            facultyId: facultyId,
                            roleId: facultyRole.id,
                        })];
                case 24:
                    _c.sent();
                    console.log("Role assigned (faculty) \u2192 ".concat(user.email));
                    _c.label = 25;
                case 25:
                    _b++;
                    return [3 /*break*/, 17];
                case 26:
                    console.log("Seeding complete!");
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
seed().catch(function (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
});
