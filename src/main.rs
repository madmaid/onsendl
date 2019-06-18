extern crate dirs;
extern crate failure;
//extern crate futures;
extern crate reqwest;
extern crate roxmltree;
extern crate serde;
extern crate serde_json;
//extern crate tokio;
#[macro_use]
extern crate serde_derive;
#[macro_use]
extern crate derive_builder;

//use std::env;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

//use futures::Future;
//use reqwest::r#async::Client;
use roxmltree::{Document, Node};

const XML: &'static str = "https://www.onsen.ag/app/programs.xml";
const LOG_DIR_RELPATH: &'static str = ".log/onsen/";
const LOG_JSON: &'static str = "onsen.json";
//const RECORDED_DIR: &'static str = "/media/recorded/onsen/";
//const RECORDED_DIR_RELPATH: &'static str = "onsen/";

#[derive(Default, Serialize, Deserialize, Builder)]
#[builder(default)]
struct Program {
    id: String,
    title: String,
    up_date: String,
    movie_url: String,
    url_id: String,
    program_number: Option<u8>,
    actor_tag: Vec<String>,
    is_new: bool,
}

#[derive(Serialize, Deserialize)]
struct Log {
    programs: Vec<Program>,
}

fn mkdir_under_home(relpath: PathBuf) -> Result<PathBuf, failure::Error> {
    let path = dirs::home_dir().unwrap().join(relpath);
    if !(&path).is_dir() {
        std::fs::create_dir(&path).expect("Failed to mkdir_under_home");
    }
    Ok(path)
}

fn main() -> Result<(), failure::Error> {
    let xml_text: String = reqwest::get(XML)?.text()?;
    let doc: Document = Document::parse(xml_text.as_str())?;

    //let log_dir = Path::new(LOG_DIR);
    //if !(&log_dir).exists() {
    //std::fs::create_dir(&log_dir)?;
    //}

    //let env::args()

    let log_dir = mkdir_under_home(PathBuf::from(LOG_DIR_RELPATH))?;
    let log_json_path = log_dir.join(Path::new(LOG_JSON));
    //let audio_dir = mkdir_under_home(PathBuf::from(RECORDED_DIR_RELPATH))?;
    //let audio_dir = PathBuf::from(RECORDED_DIR);
    let args: Vec<String> = std::env::args().collect();
    let recorded_dir = &args[1];
    let audio_dir = PathBuf::from(recorded_dir);

    let mut logfile = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(&log_json_path)?;

    let mut old_log: Vec<Program> = serde_json::from_reader(&logfile).unwrap_or(Vec::new());

    let programs = doc
        .descendants()
        .filter(|n: &Node| n.has_tag_name("program"));

    let mut additional_programs: Vec<Program> = Vec::new();
    for p in programs {
        //{
        //let n = programs.collect::<Vec<Node>>()[0];
        let mut builder = ProgramBuilder::default();
        builder.id(p.attribute("id").unwrap_or("").to_owned());
        for elem in p.children().filter(|n| n.is_element()) {
            match elem.tag_name().name() {
                "title" => builder.title(elem.text().expect("Missing title").to_owned()),
                "program_number" => builder.program_number(
                    elem.text()
                        .expect("Missing program_number")
                        .parse::<u8>()
                        .ok(),
                ),
                "up_date" => builder.up_date(elem.text().expect("Missing up_date").to_owned()),
                //"up_date" => builder.up_date(elem.text().map(String::from)),
                "movie_url" => {
                    let movie_url = elem.text().unwrap_or("");
                    builder.movie_url(movie_url.to_string());
                    builder.url_id(
                        movie_url
                            .split('/')
                            .into_iter()
                            .last() // hogefugaX1y23Z.mp3
                            .expect("Failed to split")
                            .to_string(),
                    )
                }
                "actor_tag" => builder.actor_tag(
                    elem.text()
                        .map(|s| {
                            s.split(',')
                                .collect::<Vec<&str>>()
                                .into_iter()
                                .map(String::from)
                                .collect()
                        })
                        .unwrap_or(Vec::new()), //.expect("Missing actor_tag")
                ),
                "is_new" => builder.is_new(
                    elem.text()
                        .expect("Missing is_new")
                        .parse::<u8>()
                        .unwrap_or(0)
                        == 1,
                ),

                _ => &mut builder,
            };
        }
        let program: Program = builder.build().expect("Missing Some Attributes");
        if program.movie_url == String::new() {
            // Download Unavailable
            continue;
        }

        let not_in_log = old_log.iter().all(|old| old.movie_url != program.movie_url);
        let is_not_streaming = program.movie_url != String::new();

        if not_in_log && is_not_streaming {
            // fetch audio then write it
            let client = reqwest::Client::new();
            let mut res = client.get(&program.movie_url).send()?;

            let mut audio_data: Vec<u8> = Vec::new();
            res.read_to_end(&mut audio_data)?;

            let audio_path = audio_dir.join(Path::new(&program.url_id));
            let mut audio_file = File::create(audio_path)?;
            audio_file.write_all(&audio_data)?;
        }

        if not_in_log {
            additional_programs.push(program);
        }
    }
    old_log.append(&mut additional_programs);

    let mut bufw: Vec<u8> = Vec::new();
    serde_json::to_writer_pretty(&mut bufw, &old_log)?;
    //logfile.write_all(&bufw)?;
    logfile.seek(SeekFrom::Start(0))?;
    logfile.write_all(&bufw)?;

    Ok(())
}
