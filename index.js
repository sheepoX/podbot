'use strict';

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const parse = require('csv-parse');
const csvWriter = require('csv-write-stream');

//Discord Tokens
const TOKEN = 'MzQwMjEwOTY2MjAzNzI3ODcy.DFvOJg.h7n_xsoFFknZ_Y0JGgYO4E84q7I';
const CONTROLLER_IDS = [];

//Globals
var startIndex = -1;
var trueIndex = -1;
var timer = 0;
var startTime = [];
var topic = [];
var link = [];
var ms = [];
var intervalID;
var timeoutID;
var podTitle = null;
var podcastName = null;
var templateLoaded = false;

// Extract Keywords from Discord Inputs
function locations(substring,string){
    var a=[], i=-1;
    while((i=string.indexOf(substring,i+1)) >= 0) a.push(i);
    return a;
}

function extractStrings(locations,string){
    var a=[];
    for(var i=0; i < locations.length; i++){
        if (i !== locations.length - 1){
            a.push(string.substr(locations[i]+1,locations[i+1]-locations[i]-1).trim());
        }
        else{
            a.push(string.substr(locations[i]+1).trim());
        }
    }
    return a;
}

//Convert seconds to MM:SS format
function secToTime(duration) {
        let minutes = Math.floor(duration / 60);
        let seconds = duration - minutes * 60;
    
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return minutes + ":" + seconds;
}

// Populate controller_ids

fs.readFile('controllers.txt', 'utf8', (err, data) => {
	if (!err) {
		[].push.apply(CONTROLLER_IDS, data.split(/\s+/));
	}
});

class Podbot {
	constructor(token) {
		this.client = new Discord.Client();
		this.commandCharacter = '/';
		this.podcastsPath = Podbot._makePodcastsDirectory();
        this.templatePath = Podbot._makeTemplatesDirectory();

		this._controllerUsers = new Set();
        
		this._voiceConnections = new Map();
		this._voiceReceivers = new Map();
		this._writeStreams = new Map();
        
		this.client.on('ready', this._onReady.bind(this));

		this.client.on('message', this._onMessage.bind(this));

		this.client.on('guildMemberSpeaking', this._onGuildMemberSpeaking.bind(this));

		this.client.login(token).catch(console.error);
	}

	_onReady() {
		console.log('Ready!');

		CONTROLLER_IDS.forEach((id) => {
			this.client.fetchUser(id).then(user => {
				this._controllerUsers.add(user);
			}).catch(console.error);
		});
	}

	_onMessage(message) {
        
        const start_podcast_reg = /^podon .*/;
		const create_podcast_reg = /^create_podcast .*/;
        const add_section_reg = /^add_topic .*/;
        
		if (message.content.charAt(0) === this.commandCharacter) {
            if (start_podcast_reg.test(message.content.slice(1))){
                podTitle = message.content.slice(1).substr(6).trim();
                this._podon(message.member,podTitle, message);
            }
            else if (message.content.slice(1) === 'podoff'){
                this._podoff(message.member);
            }
            else if (create_podcast_reg.test(message.content.slice(1))){
                if (this._checkMemberHasPermissions(message.member)) {
                    let title = message.content.slice(1).substr(15).trim() + '.csv';
                    let outputPath = path.join(this.templatePath,title);
                    this.writer = 
                        csvWriter({headers: ["Topic","Link","Time_Start"]});
                    this.writer.pipe(fs.createWriteStream(outputPath));
                    message.reply('Insert Podcast Sections: /add_topic |topic|link|startTime');
                    message.reply('When finished: /finish_podcast');
                }
                else{
                    message.reply("No Permission");
                }
            }
            else if (add_section_reg.test(message.content.slice(1))){
                if (this._checkMemberHasPermissions(message.member)) {
                    if (this.writer !== null){
                        var newTopic = extractStrings(locations("|",message.content.slice(1))
                            ,message.content.slice(1));
                        this.writer.write(newTopic);
                        message.reply(newTopic[0] + ' Section Added!');
                    }
                    else{
                        message.reply('Create a Podcast First!');
                    }
                }
                else{
                    message.reply("No Permission");
                }
            }
            else if (message.content.slice(1) === 'finish_podcast'){
                if (this._checkMemberHasPermissions(message.member)) {
                    this.writer.end;
                    this.writer = null;
                    message.reply('Podcast Template Finished')
                }
                else{
                    message.reply("No Permission");
                }
            }
            else if (message.content.slice(1) === 'next_topic'){
                if (this._checkMemberHasPermissions(message.member)) {
                    if (!templateLoaded){
                        message.reply("No Template Loaded")
                        return;
                    }
                    message.reply('Current Topic: '+ topic[i] + ' - ' + link[i]);
                    let curTime = secToTime(timer);
                    startTime.push(curTime);
                    trueIndex++;
                }
                else{
                    message.reply("No Permission");
                }
            }
		}
	}

	_onGuildMemberSpeaking(member, speaking) {
		// Close the writeStream when a member stops speaking
		if (!speaking && member.voiceChannel) {
			let receiver = this._voiceReceivers.get(member.voiceChannelID);
			if (receiver) {
				let writeStream = this._writeStreams.get(member.id);
				if (writeStream) {
					this._writeStreams.delete(member.id);
					writeStream.end(err => {
						if (err) {
							console.error(err);
						}
					});
				}
			}
		}
	}

	_podon(member, podcastTitle, message) {
		if (!member) {
            message.reply('Not Member');
			return;
		}
		if (!this._checkMemberHasPermissions(member)) {
			message.reply('No Permission');
            return;
		}
		if (!member.voiceChannel) {
			message.reply('Incorrect Voice Channel');
            return;
		}
        
        let podTitleCSV = podcastTitle + '.csv';
        let readPath = path.join(this.templatePath,podTitleCSV);
        
        podcastName = `${podcastTitle}-${Date.now()}`;
        
        fs.readFile(readPath, function (err, data) {
            if (!err){
                parse(data, {columns: true, trim: true}, function(err, rows){
                    if (!err){
                        templateLoaded = true;
                        intervalID = setInterval(function(){
                            timer++;},1000);
                            
                        for(var i = 0; i < rows.length; i++){
                          topic.push(rows[i].Topic);
                          link.push(rows[i].Link);
                          var start_time = rows[i].Time_Start;
                          var min = parseInt(start_time.substr(0,2));
                          var sec = parseInt(start_time.substr(3));
                          ms.push((min*60000)+(sec*1000));
                        }
                        
                        startIndex = 0;
                        trueIndex = 0;

                        function doSetTimeout(i){
                            timeoutID = setTimeout(function() { 
                                if (trueIndex == startIndex && trueIndex !== -1 && startIndex !== -1){
                                    message.reply('Current Topic: '+ topic[i] + ' - ' + link[i]);
                                    startIndex++;
                                    trueIndex++;
                                    let curTime = secToTime(timer);
                                    startTime.push(curTime);
                                }
                                else{
                                    startIndex++;
                                }
                            }, ms[i]);
                        }
                        
                        for (var i = 0; i < topic.length; i++){    
                            doSetTimeout(i);
                        }
                    }
                    else{
                        message.reply("File Error");
                        message.reply("No Template Loaded");
                        return;
                    }});
                }
                else{
                    message.reply("File Not Found");
                    message.reply("No Template Loaded");
                    return;
                }});
        
        message.reply('Starting');
        Podbot._makeDirectory(path.join(this.podcastsPath, podcastName));
        
		member.voiceChannel.join().then((voiceConnection) => {
			this._voiceConnections.set(member.voiceChannelID, voiceConnection);
			let voiceReceiver = voiceConnection.createReceiver();
			voiceReceiver.on('opus', (user, data) => {
				let hexString = data.toString('hex');
				let writeStream = this._writeStreams.get(user.id);
				if (!writeStream) {
					/* If there isn't an ongoing writeStream and a frame of silence is received then it must be the
					 *   left over trailing silence frames used to signal the end of the transmission.
					 * If we do not ignore this frame at this point we will create a new writeStream that is labelled
					 *   as starting at the current time, but there will actually be a time delay before it is further
					 *   populated by data once the user has begun speaking again.
					 * This delay would not be captured however since no data is sent for it, so the result would be
					 *   the audio fragments being out of time when reassembled.
					 * For this reason a packet of silence cannot be used to create a new writeStream.
					 */
					if (hexString === 'f8fffe') {
						return;
					}
					let outputPath = path.join(this.podcastsPath, podcastName, `${podcastTitle}-${Date.now()}.opus_string`);
					writeStream = fs.createWriteStream(outputPath);
					this._writeStreams.set(user.id, writeStream);
				}
				writeStream.write(`,${hexString}`);
			});
			this._voiceReceivers.set(member.voiceChannelID, voiceReceiver);
		}).catch(console.error);
	}

	_podoff(member) {
		if (!member) {
			return;
		}
		if (!this._checkMemberHasPermissions(member)) {
			return;
		}
        
        console.log("Ending");
        
		if (this._voiceReceivers.get(member.voiceChannelID)) {
			this._voiceReceivers.get(member.voiceChannelID).destroy();
			this._voiceReceivers.delete(member.voiceChannelID);
			this._voiceConnections.get(member.voiceChannelID).disconnect();
			this._voiceConnections.delete(member.voiceChannelID);
		}
        
        podcastName = null;
        
        if (!templateLoaded){
            return;
        }
        
        let podGuidePath = path.join(this.podcastsPath,podcastName,podTitle+'-Guide.csv');
        var guideWriter = csvWriter({headers: ["Topic","Link","Time_Start"]});
        guideWriter.pipe(fs.createWriteStream(podGuidePath));
        
        
        for(var i = 0; i < startTime.length; i++){
            let guideInput = [topic[i],link[i],startTime[i]];
            guideWriter.write(guideInput);
        }
        
        guideWriter.end();
        guideWriter = null;
        
        templateLoaded = false;
        clearInterval(intervalID);
        clearTimeout(timeoutID);
        timer = 0;
        startIndex = -1;
        trueIndex = -1;
        topic = [];
        link = [];
        ms = [];
        podTitle = null;
        
	}

	_checkMemberHasPermissions(member) {
		if (this._controllerUsers.has(member.user)) {
			return true;
		}
	}

	static _makePodcastsDirectory() {
		let dir = path.join('.', 'podcasts');
		Podbot._makeDirectory(dir);
		return dir;
	}
    
    static _makeTemplatesDirectory() {
		let dir = path.join('.', 'templates');
		Podbot._makeDirectory(dir);
		return dir;
	}

	static _makeDirectory(dir) {
		try {
			fs.mkdirSync(dir);
		} catch (err) {
			// Don't care, presumably the folder exists already
		}
	}
}

const podbot = new Podbot(TOKEN);
