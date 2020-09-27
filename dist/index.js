"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
var process = __importStar(require("process"));
var child_process = __importStar(require("child_process"));
var util_1 = require("util");
var axios_1 = __importDefault(require("axios"));
var yargs = __importStar(require("yargs"));
var API = "https://www.onsen.ag/web_api/programs";
var ffmpegCmd = function (url, dst, video) { return video
    ? "ffmpeg -n -i " + url + " -movflags faststart -c copy -bsf:a aac_adtstoasc \"" + dst + ".mp4\""
    : "ffmpeg -n -i " + url + " -acodec copy -bsf:a aac_adtstoasc \"" + dst + ".m4a\""; };
var defaultConfigDir = path.join(process.env["HOME"] || "./", ".config/onsendl/config.json");
var defaultRecordedDir = "/media/recorded/onsen/";
function download(content, programTitle, recordedDir) {
    // TODO: support premium
    if (content.streaming_url === null) {
        return;
    }
    var filename = programTitle + " " + content.title;
    var dst = path.join(recordedDir || defaultRecordedDir, filename);
    var video = content.movie;
    try {
        // TODO: download as .m4a.part then rename with .m4a
        child_process.execSync(ffmpegCmd(content.streaming_url, dst, video));
    }
    catch (err) {
    }
}
function crawl(recordedDir, config, flags) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, programs, today;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.get(API)];
                case 1:
                    resp = _a.sent();
                    programs = resp.data;
                    today = new Date();
                    programs.forEach(function (program) {
                        program.contents.forEach(function (content) {
                            // コンテンツが予告でないか 予告をダウンロードする設定なら ダウンロード
                            // const isDownloadAnnouncement = content.title.includes("予告") ? flags.announcement : true;
                            var isDownloadAnnouncement = !content.title.includes("予告") || flags.announcement;
                            // コンテンツが最新回であるか 過去回をダウンロードする設定なら ダウンロード
                            // const isDownloadBacknumber = content.latest ? true : flags.backnumber;
                            var isDownloadBacknumber = content.latest || flags.backnumber;
                            // コンテンツの配信日が今日の曜日であるか 全ての曜日をダウンロードする設定なら ダウンロード
                            // const isDownloadOtherWeekday = program.delivery_day_of_week === today.getDay() ? true : flags.allWeekday;
                            var isDownloadOtherWeekday = program.delivery_day_of_week === today.getDay() || flags.allWeekday;
                            // コンテンツが無料公開か 設定でプレミアムを有効にしているなら ダウンロード
                            // const isDownloadPremium = content.premium ? config.premium : true;
                            var isDownloadPremium = !content.premium || config.premium;
                            if (isDownloadAnnouncement && isDownloadBacknumber && isDownloadOtherWeekday && isDownloadPremium) {
                                download(content, program.title, recordedDir);
                            }
                        });
                    });
                    return [2 /*return*/];
            }
        });
    });
}
(function main() {
    return __awaiter(this, void 0, void 0, function () {
        var argv, flags, configPath, config;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    argv = yargs.options({
                        "all": {
                            alias: "a",
                            type: "boolean",
                            default: false,
                            description: "Download all contents"
                        },
                        "all-weekday": {
                            alias: "aw",
                            type: "boolean",
                            default: false,
                            description: "Download contents on all weekday",
                        },
                        "announcement": {
                            alias: "an",
                            type: "boolean",
                            default: false,
                            description: "Download annoucement as addition"
                        },
                        "backnumber": {
                            alias: "bn",
                            type: "boolean",
                            default: false,
                            description: "Download past contents as addition"
                        },
                        "recorded-dir": {
                            alias: "o",
                            type: "string",
                            default: defaultRecordedDir,
                            description: "Specify a directory where downloaded"
                        },
                        "config": {
                            alias: "c",
                            type: "string",
                            default: defaultConfigDir,
                            description: "specify a config file",
                        }
                    }).argv;
                    flags = {
                        allWeekday: argv.all || argv.allWeekday,
                        announcement: argv.all || argv.announcement,
                        backnumber: argv.all || argv.backnumber
                    };
                    configPath = argv.config || defaultConfigDir;
                    return [4 /*yield*/, util_1.promisify(fs.readFile)(configPath, "utf-8").then(JSON.parse).catch(function () {
                            return {
                                premium: false,
                                userid: "",
                                password: "",
                            };
                        })];
                case 1:
                    config = _a.sent();
                    return [4 /*yield*/, crawl(argv.recordedDir, config, flags)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
})();
