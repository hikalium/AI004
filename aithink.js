function AI_Think(env){
	this.env = env;
	this.jobStack = new Array();
	this.processingJob = null;
}
AI_Think.prototype = {
	tickLimitMs: 100,
	tick: function(){
		//定期的に呼ばれることを期待する
		if(this.env.input.sentenceList.length > 0){
			var tickStartTimeMs = new Date();
			this.env.debug("**** Think ****\n");
			for(var i = 0; i < 64; i++){
				if((new Date()) - tickStartTimeMs > this.tickLimitMs){
					//CPU時間占有防止
					break;
				}
				//入力処理ループ
				var s = this.env.input.getSentence();
				if(s === undefined){
					//単語候補をソート
					this.env.wordRecognition.sortCandidateWordListByWordCount();
					this.env.wordRecognition.computeEachWordLevel();
					this.env.wordRecognition.sortCandidateWordListByWordLevel();
					break;
				}
				if(this.env.input.lastSentenceSourceType){
					this.env.message(this.env.input.lastSentenceSourceType, true);
				} else{
					this.env.message("Unknown", true);
				}
				this.env.message("> " + s + "\n", true);
				
				var separated = this.env.wordRecognition.splitByWord(s);
				this.env.debug("[" + separated.join(" ") + "]\n");
				
				//パターン照合
				this.checkPattern(separated);
				
				//ジョブに入力
				if(this.processingJob && this.processingJob.input(s) === undefined){
					this.processingJob = null;
				}
			}
		} else if(this.processingJob || this.jobStack.length > 0){
			if(!this.processingJob){
				this.processingJob = this.jobStack.pop();
			}
			if(this.processingJob.tick() === undefined){
				this.processingJob = null;
			}
		}
	},
	checkPattern: function(separated){
		var separated_UUID = this.env.wordRecognition.getUUIDListFromSeparatedString(separated);
		this.env.debug("[\n" + separated_UUID.join("\n") + "\n]\n");
		var pList = this.env.memory.patternList.copy();
		
		if(pList.length <= 0 || separated.length <= 0 || separated_UUID.length <= 0){
			return new Array();
		}
		
		for(var i = 0, iLen = pList.length; i < iLen; i++){
			var p = pList[i].pattern;
			//単純完全一致
			if(separated_UUID.length != p.length){
				pList.removeByIndex(i);
				i--;
				iLen--;
			} else{
				for(var j = 0, jLen = separated_UUID.length; j < jLen; j++){
					if(p[j] != separated_UUID[j]){
						pList.removeByIndex(i);
						i--;
						iLen--;
						break;
					}
				}
			}
		}
		
		for(var i = 0, iLen = pList.length; i < iLen; i++){
			var p = pList[i];
			if(p.func){
				p.func(this.env, separated, separated_UUID);
			}
		}
		
		return pList;
	},
}
