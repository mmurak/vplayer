class GlobalManager {
	constructor() {
		this.headerSection = document.getElementById("headerSection");
		this.mediaFile = document.getElementById("mediaFile");
		this.filename = document.getElementById("filename");
		this.videoContainer = document.getElementById("videoContainer");
		this.videoElement = document.getElementById("videoElement");
		this.pressPlay = document.getElementById("pressPlay");
		this.isPressHold = false;
		this.playPause = document.getElementById("playPause");
		this.textArea = document.getElementById("textArea");
		this.startPoint = 0.0;
		this.videoControls = document.getElementById('video-controls');
		this.progress = document.getElementById('progress');
		this.progressBar = document.getElementById('progress-bar');
		this.frameWidth = "100%";
	}
}

let G = new GlobalManager();

initParameters();

G.videoElement.controls = false;
G.videoControls.setAttribute('data-state', 'visible');
mark();

window.addEventListener("resize", (evt) => {
	resize();
});
window.addEventListener("load", (evt) => {
	resize();
});

G.mediaFile.addEventListener("change", (evt) => {
	let file = evt.target.files[0];
	if  (typeof file === "undefined") return;
	G.filename.innerHTML = file.name;
	let ext = file.name.split(".");
	if (ext.length < 2) return;
	switch (ext.pop()) {
		case "txt" :
			let reader = new FileReader();
			reader.readAsText(file);
			reader.onload = function () {
				G.textArea.value = reader.result;
			}
			break;
		case "srt" :
			let srtReader = new FileReader();
			srtReader.readAsText(file);
			srtReader.onload = function () {
				G.textArea.value = srt2internalExp(srtReader.result);
			}
			break;
		default:
			mp4subtitles.load(file, readyCallback);
			G.videoElement.src = window.URL.createObjectURL(file);
			G.startPoint = 0.0;
			resize();
			G.pressPlay.disabled = false;
			G.playPause.disabled = false;
	}
}, false);
G.pressPlay.addEventListener("mousedown", (evt) => {
	G.isPressHold = true;
	resetPlayPause();
	G.videoElement.currentTime = G.startPoint;
	G.videoElement.play();
	evt.preventDefault();
});
G.pressPlay.addEventListener("mouseup", (evt) => {
	G.isPressHold = false;
	G.videoElement.pause();
	evt.preventDefault();
});
G.pressPlay.addEventListener("touchstart", (evt) => {
	G.isPressHold = true;
	resetPlayPause();
	G.videoElement.currentTime = G.startPoint;
	G.videoElement.play();
	evt.preventDefault();
});
G.pressPlay.addEventListener("touchend", (evt) => {
	G.isPressHold = false;
	G.videoElement.pause();
	evt.preventDefault();
});
G.textArea.addEventListener("click", (evt) =>{
	register();
	evt.preventDefault();
});
G.videoElement.addEventListener('loadedmetadata', function() {
	G.progress.setAttribute('max', G.videoElement.duration);
});
G.videoElement.addEventListener('play', function() {
	//	changeButtonState('playpause');
	if (!G.isPressHold) {
		G.playPause.style = "background: red";
		G.playPause.value = "Tap for\nPause";
	}
}, false);
G.videoElement.addEventListener('pause', function() {
	setPlayPause();
}, false);
G.playPause.addEventListener('click', function(e) {
	if (G.videoElement.paused || G.videoElement.ended) {
		G.videoElement.play();
	} else {
		G.videoElement.pause();
	}
});
G.textArea.addEventListener("touchstart", (evt) =>{
	register();
});
G.videoElement.addEventListener('timeupdate', function() {
	// For mobile browsers, ensure that the progress element's max attribute is set
	if (!G.progress.getAttribute('max')) {
		G.progress.setAttribute('max', G.videoElement.duration);
	}
	G.progress.value = G.videoElement.currentTime;
	G.progressBar.style.width = Math.floor((G.videoElement.currentTime / G.videoElement.duration) * 100) + '%';
});
// React to the user clicking within the progress bar
G.progress.addEventListener('click', function(e) {
	//var pos = (e.pageX  - this.offsetLeft) / this.offsetWidth; // Also need to take the parent into account here as .controls now has position:relative
	let pos = (e.pageX  - (this.offsetLeft + this.offsetParent.offsetLeft)) / this.offsetWidth;
	G.videoElement.currentTime = pos * G.videoElement.duration;
	if (G.videoElement.paused) {
		setPlayPause();
	}
});
document.addEventListener("dblclick", (e) => {
    e.preventDefault();
});


function readyCallback() {
	let langList = mp4subtitles.getAvailableLanguage();
	if (langList.includes("English")) {
		mp4subtitles.getScriptsArray("English", scriptsReady);
	}
}

function scriptsReady(scriptsArray) {
	let sheet = "";
	let no = 1;
	for(let s of scriptsArray) {
		sheet += no + "\n" + getSRTTime(s[0], ",") + " --> " + getSRTTime(s[1], ",") + "\n" + s[2] + "\n\n";
		no++;
	}
	G.textArea.value = srt2internalExp(sheet);
}

function getSRTTime(currentTime) {
    let ct = Math.floor(currentTime / 1000);
    let hour = Math.floor(ct / 3600000);
    let minute = Math.floor(ct % 3600000 / 60000);
    let sec = Math.floor(ct % 60000 / 1000);
    let csec = Math.floor(ct % 1000);
    return ("00" + hour).slice(-2) + ":" + ("00" + minute).slice(-2) + ":" + ("00" + sec).slice(-2) + "," + ("000" + csec).slice(-3);
}

function register() {
	let dat = G.textArea.value;
	let pt = G.textArea.selectionStart;

	let leftValue = dat.substring(0, pt);
	let rightValue = dat.substring(pt);
	let a = leftValue.lastIndexOf("[[");
	let b = leftValue.lastIndexOf("]]");
	if ((a == -1) || (b > a)) {
		return;
	}
	let c = rightValue.indexOf("]]");
	let timeValue = leftValue.substring(a+2) + rightValue.substring(0, c);
	G.textArea.selectionStart = pt + c + 2;
	G.videoElement.currentTime = stringTimeToSec(timeValue);
	mark();
}

function markAndLog() {
	mark();
	let saveIt = G.textArea.selectionStart;
	let stampVal = "[[" + getTime(G.startPoint) + "]]";
	G.textArea.value = G.textArea.value.substring(0, saveIt) + stampVal + 
		G.textArea.value.substring(G.textArea.selectionEnd);
	saveIt += stampVal.length;
	G.textArea.setSelectionRange(saveIt, saveIt);
	G.textArea.focus();	// to make chrome happy.
}

function mark() {
	G.startPoint = G.videoElement.currentTime;
	const labelStart = getTime(G.startPoint);
	G.pressPlay.value = "Press Play\nfrom " + labelStart;
	G.playPause.value = "Tap Play\nfrom " + labelStart;
}

function getTime(currentTime) {
    let ct = Math.floor(currentTime * 1000);
    let hour = Math.floor(ct / 3600000);
    let minute = Math.floor(ct % 3600000 / 60000);
    let sec = Math.floor(ct % 60000 / 1000);
    let csec = Math.floor(ct % 1000);
    return ("00" + hour).slice(-2) + ":" + ("00" + minute).slice(-2) + ":" + ("00" + sec).slice(-2) + "." + ("00" + csec).slice(-3);
}

function stringTimeToSec(str) {
	let parts = str.split(/:/);
	let factor = 1;
	let val = 0;
	for (let i = parts.length - 1; i >= 0; i--) {
		val += factor * parts[i];
		factor *= 60;
	}
	return val;
}

function resetPlayPause() {
	G.playPause.style = "background: #339270";
	G.playPause.value = "Tap Play\nfrom " + getTime(G.startPoint);
}

function setPlayPause() {
	G.playPause.style = "background: #339270";
	G.playPause.value = "Tap Play\nfrom " + getTime(G.videoElement.currentTime);
}

function rewind(sec) {
	let result = G.videoElement.currentTime - sec;
	if (result < 0) {
		result = 0;
	} else if (result > G.videoElement.duration) {
		result = G.videoElement.duration;
	}
	G.videoElement.currentTime = result;
	if (G.videoElement.paused) {
		setPlayPause();
	}
}

// Called when speed-slider is changed.
function speedChange(obj) {
	G.videoElement.playbackRate =obj.value;
}

function resize() {
	G.videoContainer.style = "width: " + G.frameWidth;
	G.textArea.style = "height: " + (window.innerHeight - 
		G.headerSection.getBoundingClientRect().height - 5) + "px;";
}

function srt2internalExp(text) {
	let clusters = text.split(/\n\n/);
	let result = "";
	let savedLine = "";
	let savedTime = "";
	for (let i = 0; i < clusters.length; i++) {
		let m = clusters[i].match(/^(\d+)\n(\d\d:\d\d:\d\d,\d\d\d) --> \d\d:\d\d:\d\d,\d\d\d\n((.|\n|\r\n)*)$/);
		if (m != null) {
			savedTime = (savedTime == "") ? "[[" + m[2].replace(",", ".") + "]]" : savedTime;
			let val = m[3].trim().replaceAll(/(\n|\r\n)/g, " ");
			savedLine += " " + val;
			if ((val.slice(-1) == ".") || (val.slice(-1) == "!") || (val.slice(-1) == "?") || (val.slice(-1) == ")")) {
				result += savedTime + savedLine + "\n";
				savedTime = "";
				savedLine = "";
			}
		}
	}
	if (savedLine != "") {
		result += savedTime + savedLine + "\n";
	}
	return result;
}

// Parameter initialisation
function initParameters() {
	let urlParm = location.search.substring(1);
	if (urlParm != "") {
		let args = urlParm.split("&");
		for(let i = 0; i < args.length; i++) {
			_checkAndModify(0, args[i]);
		}
	}
}
function _checkAndModify(dest, parm) {
	let parmPair = parm.split("=");
	if (typeof parmPair[1] !== "undefined") {
		if (parmPair[0] == "w") {
			G.frameWidth = parmPair[1] + "%";
		} else {
			console.log("Parameter name not found: " + parm);
		}
	} else {
		console.log("Parameter format error: " + parm);
	}
}


// File Writer
function saveScript() {
	let bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
	let blob = new Blob([ bom,  G.textArea.value ], { "type" : "text/plain" });
	const a = document.createElement("a");
	a.href = window.URL.createObjectURL(blob);
	a.download = "script.txt";
	a.click();
}
