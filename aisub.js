function AI_IOManager(env){
	this.env = env;
	this.lastSentenceSourceType = undefined;
}
AI_IOManager.prototype = {
	//http://www.atmarkit.co.jp/ait/articles/1112/16/news135_2.html
	//http://qiita.com/mohayonao/items/fa7d33b75a2852d966fc
	showDownloadLink: function(blobData){
		if(window.URL){
			this.env.downloadBox.innerHTML = "<a href='" + window.URL.createObjectURL(blobData) + "' target='_blank'>ダウンロード</a>";
		} else if(window.webkitURL){
			this.env.downloadBox.innerHTML = "<a href='" + window.webkitURL.createObjectURL(blobData) + "' target='_blank'>ダウンロード</a>";
		} else{
			window.alert("Can't create URL");
		}
	}
}

function AI_Input(env){
	this.env = env;
	this.historyList = new Array();
	this.sentenceList = new Array();
}
AI_Input.prototype = {
	maxHistoryLength: 16,
	sentenceSeparator: [
		"。",
		"！",
		"？",
		"!",
		"?",
		"\n",
	],
	appendInput: function(input, srctype){
		//inputはStringとArrayが使用できる
		var sList = input.splitByArray(this.sentenceSeparator);
		this.sentenceList.push([srctype]);
		this.sentenceList = this.sentenceList.concat(sList);
	},
	getSentence: function(){
		//改行のみの文は破棄
		for(;;){
			if(this.sentenceList.length <= 0){
				return undefined;
			}
			var retv = this.sentenceList.shift();
			if(retv instanceof Array){
				//ソースタイプ変更
				this.lastSentenceSourceType = retv[0];
				continue;
			}
			retv = retv.trim();
			if(retv != ""){
				break;
			}
		}
		//ここで単語候補抽出を行っておく
		this.env.wordRecognition.slideLookUpCandidateWordByHistory(retv);
		//
		this.appendHistory(retv);
		return retv;
	},
	appendHistory: function(str){
		this.historyList.push(str);
		if(this.historyList.length > this.maxHistoryLength){
			this.historyList.splice(0, this.maxHistoryLength >> 1);
		}
	},
}
