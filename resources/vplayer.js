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
		this.interactiveArray = [];
		this.tracePtr = 0;
		this.baseColor = "floralwhite";
		this.emphasisColor = "pink";
		this.displayOffset = 2;
		this.logColor = "red";
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
				G.textArea.innerHTML = convertTxtScript(reader.result);
			}
			break;
		case "srt" :
			let srtReader = new FileReader();
			srtReader.readAsText(file);
			srtReader.onload = function () {
				G.textArea.innerHTML = srt2internalExp(srtReader.result);
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
	G.tracePtr = findLine();
	clearAllLines();
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
//	evt.preventDefault();
});
G.videoElement.addEventListener('timeupdate', function() {
	// For mobile browsers, ensure that the progress element's max attribute is set
	if (!G.progress.getAttribute('max')) {
		G.progress.setAttribute('max', G.videoElement.duration);
	}
	G.progress.value = G.videoElement.currentTime;
	G.progressBar.style.width = Math.floor((G.videoElement.currentTime / G.videoElement.duration) * 100) + '%';
	interactiveSubtitles();
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
	G.textArea.innerHTML = srt2internalExp(sheet);
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
	let dat = G.textArea.textContent;
	let pt = getCaretCharacterOffsetWithin(G.textArea);

	let leftValue = dat.substring(0, pt);
	let rightValue = dat.substring(pt);
	let a = leftValue.lastIndexOf("[[");
	let b = leftValue.lastIndexOf("]]");
	if ((a == -1) || (b > a)) {
		return;
	}
	let c = rightValue.indexOf("]]");
	let timeValue = leftValue.substring(a+2) + rightValue.substring(0, c);
	G.videoElement.currentTime = stringTimeToSec(timeValue);
	mark();
	//////////
	let selectedText = window.getSelection();
	let selectedRange = document.createRange();
	selectedRange.setStart(selectedText.focusNode, 16);
	selectedRange.setEnd(selectedText.focusNode, 16);
	selectedRange.collapse(true);
	selectedText.removeAllRanges();
	selectedText.addRange(selectedRange);
	G.textArea.focus();
	//////////
}

function markAndLog() {
	mark();
	let stampVal = '<span style="color:' + G.logColor + '">[[' + getTime(G.startPoint) + ']]</span>';
	G.textArea.focus();
	pasteHtmlAtCaret(stampVal);
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
		G.headerSection.getBoundingClientRect().height - 15) + "px;";
}

function convertTxtScript(text) {
	G.interactiveArray = [];
	let clusters = text.split(/\n/);
	let result = "";
	G.lineNo = 1;
	for (line of clusters) {
		let blueMatch = line.match(/^\[\[(\d\d:\d\d:\d\d\.\d\d\d)\]\](.*)$/);
		if (blueMatch != null) {
			let blueTime = '<a name="' + G.lineNo + '" id="L' + G.lineNo + '" class="A">[[' + blueMatch[1] + ']]</a>';
			let rest = convertGreenMarker(blueMatch[2]);
			result += blueTime + rest + "<br/>\n";
			G.interactiveArray.push(stringTimeToSec(blueMatch[1]) - 0.1);		// 0.1 for lag
			G.lineNo++;
		} else {
			result += convertGreenMarker(line) + "<br/>\n";
		}
	}
	return result;
}

function convertGreenMarker(line) {
	let nl = line.replaceAll('[[', '<span style="color:' + G.logColor + '">[[');
	return nl.replaceAll(']]', ']]</span>');
}


function srt2internalExp(text) {
	let clusters = text.split(/\n\n/);
	let result = "";
	let savedLine = "";
	let savedTime = "";
	let internalTime = 0;
	G.lineNo = 1;
	G.interactiveArray = [];
	for (let i = 0; i < clusters.length; i++) {
		let m = clusters[i].match(/^(\d+)\n(\d\d:\d\d:\d\d,\d\d\d) --> \d\d:\d\d:\d\d,\d\d\d\n((.|\n|\r\n)*)$/);
		if (m != null) {
			if (savedTime == "") {
				savedTime =  m[2].replace(",", ".");
			}
			let val = m[3].trim().replaceAll(/(\n|\r\n)/g, " ");
			savedLine += " " + val;
			if ((val.slice(-1) == ".") || (val.slice(-1) == "!") || (val.slice(-1) == "?") || (val.slice(-1) == ")")) {
				result += "<a name='" + G.lineNo + "' id='L" + G.lineNo + "' class='A'>[[" + savedTime  + "]]</a>" + savedLine + "<br/>\n";
				G.lineNo++;
				G.interactiveArray.push(stringTimeToSec(savedTime) - 0.1);	// 0.1 for lag
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
		switch (parmPair[0]) {
			case "w":
				G.frameWidth = parmPair[1] + "%";
				break;
			case "c" :
				G.logColor = parmPair[1];
				break;
			default:
				console.log("Parameter name not found: " + parm);
		}
	} else {
		console.log("Parameter format error: " + parm);
	}
}

function changeFrameSize() {
	let a = prompt("Enter the frame ratio in %.", G.frameWidth.replace("%", ""));
	if (Number(a)) {
		G.frameWidth = a + "%";
		resize();
	}
}

// from Stackoverflow https://stackoverflow.com/questions/4767848/get-caret-cursor-position-in-contenteditable-area-containing-html-content
function getCaretCharacterOffsetWithin(element) {
	let caretOffset = 0;
	let doc = element.ownerDocument || element.document;
	let win = doc.defaultView || doc.parentWindow;
	let sel;
	if (typeof win.getSelection != "undefined") {
		sel = win.getSelection();
		if (sel.rangeCount > 0) {
			let range = win.getSelection().getRangeAt(0);
			let preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(element);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			caretOffset = preCaretRange.toString().length;
		}
	} else if ( (sel = doc.selection) && sel.type != "Control") {
		let textRange = sel.createRange();
		let preCaretTextRange = doc.body.createTextRange();
		preCaretTextRange.moveToElementText(element);
		preCaretTextRange.setEndPoint("EndToEnd", textRange);
		caretOffset = preCaretTextRange.text.length;
	}
	return caretOffset;
}

// Code from https://jsfiddle.net/Xeoncross/4tUDk/
function pasteHtmlAtCaret(html) {
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // non-standard and not supported in all browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);
            
            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}

function interactiveSubtitles() {
	let ptr = findLine() + 1;
	if (ptr != G.tracePtr) {
		setBackgroundColor(G.tracePtr, G.baseColor);
	}
	if (ptr < G.interactiveArray.length + 1) {
		setBackgroundColor(ptr, G.emphasisColor);
		G.tracePtr = ptr;
	}
	let offset = (ptr > G.displayOffset) ? ptr - G.displayOffset : 1;
	window.location.hash = offset;
//	G.textArea.focus();		// if you activate this line, you'll suffer some toggling problems,
// because the caret of this contenteditable div remains at somewhere.
}

function setBackgroundColor(at, color) {
	if (at < 1) return;
	document.getElementById("L" + at).style = "background-color:" + color;
}

function clearAllLines() {
	for (let i = 1; i < G.lineNo; i++) {
		setBackgroundColor(i, G.baseColor);
	}
}

function findLine() {
	let i = G.interactiveArray.length - 1;
	while((i >= 0) && (G.videoElement.currentTime < G.interactiveArray[i])) {
		i--;
	}
	return i;
}

// File Writer
function saveScript() {
	let bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
	let blob = new Blob([ bom,  G.textArea.innerText ], { "type" : "text/plain" });
	const a = document.createElement("a");
	a.href = window.URL.createObjectURL(blob);
	a.download = "script.txt";
	a.click();
}
