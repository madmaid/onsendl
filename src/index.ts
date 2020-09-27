import * as path from "path";
import * as fs from "fs";
import * as process from "process";
import * as child_process from "child_process";
import { promisify } from "util";

import axios from "axios";
import * as yargs from "yargs";

const API = "https://www.onsen.ag/web_api/programs";
const ffmpegCmd = (url: string, dst: string, video: boolean) => video
    ? `ffmpeg -n -i ${url} -movflags faststart -c copy -bsf:a aac_adtstoasc "${dst}.mp4"`
    : `ffmpeg -n -i ${url} -acodec copy -bsf:a aac_adtstoasc "${dst}.m4a"`

const defaultConfigDir = path.join(process.env["HOME"] || "./", ".config/onsendl/config.json");
const defaultRecordedDir = "/media/recorded/onsen/";

function download(content: Content, programTitle: string, recordedDir?: string) {
    // TODO: support premium
    if (content.streaming_url === null) {
        return
    }
    const filename = `${programTitle} ${content.title}`;
    const dst = path.join(recordedDir || defaultRecordedDir, filename);
    const video = content.movie;

    try {
        // TODO: download as .m4a.part then rename with .m4a
        child_process.execSync(ffmpegCmd(content.streaming_url, dst, video));
    } catch (err) {
    }
}

async function crawl(recordedDir: string,  config: Config, flags: Flags) {
    const resp = await axios.get(API);
    const programs: Program[] = resp.data;
    const today = new Date();
    programs.forEach(program => {
        program.contents.forEach(content => {
            // コンテンツが予告でないか 予告をダウンロードする設定なら ダウンロード
            // const isDownloadAnnouncement = content.title.includes("予告") ? flags.announcement : true;
            const isDownloadAnnouncement = !content.title.includes("予告") || flags.announcement;

            // コンテンツが最新回であるか 過去回をダウンロードする設定なら ダウンロード
            // const isDownloadBacknumber = content.latest ? true : flags.backnumber;
            const isDownloadBacknumber = content.latest || flags.backnumber;

            // コンテンツの配信日が今日の曜日であるか 全ての曜日をダウンロードする設定なら ダウンロード
            // const isDownloadOtherWeekday = program.delivery_day_of_week === today.getDay() ? true : flags.allWeekday;
            const isDownloadOtherWeekday = program.delivery_day_of_week === today.getDay() || flags.allWeekday;

            // コンテンツが無料公開か 設定でプレミアムを有効にしているなら ダウンロード
            // const isDownloadPremium = content.premium ? config.premium : true;
            const isDownloadPremium = !content.premium || config.premium;

            if (isDownloadAnnouncement && isDownloadBacknumber && isDownloadOtherWeekday && isDownloadPremium) {
                download(content, program.title, recordedDir);
            }
        })
    })
}

(async function main(){
    // parse args
    const { argv } = yargs.options({
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
    });
    // for --all option
    const flags: Flags = {
        allWeekday: argv.all || argv.allWeekday as boolean,
        announcement: argv.all || argv.announcement as boolean,
        backnumber: argv.all || argv.backnumber as boolean
    };
    // read config.json
    const configPath = argv.config || defaultConfigDir;
    const config: Config = await promisify(fs.readFile)(configPath, "utf-8").then(JSON.parse).catch(() => {
        return {
            premium: false,
            userid: "",
            password: "",
        }
    });
    await crawl(argv.recordedDir as string, config, flags);

})()

type Flags = {
    allWeekday: boolean,
    announcement: boolean,
    backnumber: boolean,
}

type Config = {
    premium: boolean,
    userid: string,
    password: string,
}

type Program = {
    id: number,
    directory_name: string,
    display: boolean,
    title: string,
    image: {
        url: string
    },
    new: boolean,
    list: boolean,
    delivery_internal: string,
    delivery_day_of_week: number,
    category_list: string[],
    copylight: string,
    sponsor_name: string,
    pay: boolean,
    updated: string,
    performers: Performer[],
    related_links: RelatedLink[],
    related_infos: RelatedInfo[],
    related_programs: RelatedProgram[],
    contents: Content[],
}

type Content = {
    id: number,
    title: string,
    bonus: boolean,
    sticky: boolean,
    latest: boolean,
    media_type: "sound" | "video",   // FIXME: maybe incorrect
    premium: boolean,
    program_id: number,
    delivery_date: string,
    movie: boolean,
    poster_image_url: string,
    streaming_url: string | null,
    tag_image: {
        url: string | null
    },
    guests: string[]
}

type Performer = {
    id: number,
    name: string
}
type RelatedLink = {
    link_url: string,
    image: string   // URL
}
type RelatedInfo = {
    category: string    // can type more strictly
    link_url: string,
    caption: string,
    image: string
}
type RelatedProgram = {
    title: string,
    directory_name: string,
    category: string    // can type more strictly
    image: string,      // URL
}
