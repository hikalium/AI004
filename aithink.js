function AI_Think(env){
	this.env = env;
	this.jobStack = new Array();
	this.processingJob = null;
}
AI_Think.prototype = {
	tickLimitMs: 100,
	tick: function(){
		//定期的に呼ばれることを期待する
		var tickStartTimeMs;
		var s;
		var separated;
		var separated_UUID;
		var t;
		tickStartTimeMs = new Date();
		if(this.env.input.sentenceList.length > 0){
			this.env.debug("**** Think ****\n");
			
			for(var i = 0; i < 64; i++){
				if((new Date()) - tickStartTimeMs > this.tickLimitMs){
					//CPU時間占有防止
					break;
				}
				//入力処理ループ
				s = this.env.input.getSentence();
				
				if(s === undefined){
					//入力文字列が終了したので、単語候補をソート
					this.env.wordRecognition.sortCandidateWordListByWordCount();
					this.env.wordRecognition.computeEachWordLevel();
					this.env.wordRecognition.sortCandidateWordListByWordLevel();
					this.env.wordRecognition.cleanCandidateWordList();
					break;
				}
				if(this.env.input.lastSentenceSourceType){
					this.env.message(this.env.input.lastSentenceSourceType, true);
				} else{
					this.env.message("Unknown", true);
				}
				this.env.message("> " + s + "\n", true);
				//ここで単語候補抽出を行っておく
				this.env.wordRecognition.slideLookUpCandidateWordByHistory(s);
				//分割
				separated = this.env.wordRecognition.splitByWord(s);
				this.env.debug("[" + separated.join(" ") + "]\n");
				separated_UUID = this.env.wordRecognition.getUUIDListFromSeparatedString(separated);
				//分割の結果、未定義文字列と判別された部分を候補単語から探し、候補単語にあれば、その出現回数を+100する。
				for(var i = 0, iLen = separated_UUID.length;i < iLen; i++){
					if(separated_UUID[i] == this.env.UUID_Meaning_UndefinedString){
						t = this.env.wordRecognition.getCandidateWordTagByString(separated[i]);
						if(t){
							t.wordCount += 100;
						}
					}
				}
				//パターン照合
				this.checkPattern(separated, separated_UUID);
				
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
	checkPattern: function(separated, separated_UUID){
		//可変長の部分を含むパターンは、
		this.env.debug("[\n" + separated_UUID.join("\n") + "\n]\n");
		var pList = this.env.memory.patternList.copy();
		
		if(pList.length <= 0 || separated.length <= 0 || separated_UUID.length <= 0){
			return new Array();
		}
		
		for(var i = 0, iLen = pList.length; i < iLen; i++){
			var p = pList[i].pattern;
			if(p instanceof Function){
				if(pList[i].pattern(separated, separated_UUID)){
					continue;
				}
			} else if(p instanceof Array){
				//単純完全一致
				if(separated_UUID.length == p.length){
					for(var j = 0, jLen = separated_UUID.length; j < jLen; j++){
						if(p[j] != separated_UUID[j]){
							break;
						}
					}
					if(j == jLen){
						continue;
					}
				}
			}
			pList.removeByIndex(i);
			i--;
			iLen--;
		}
		//マッチしたパターンに設定された関数の呼び出し
		for(var i = 0, iLen = pList.length; i < iLen; i++){
			var p = pList[i];
			if(p.func){
				p.func(this.env, separated, separated_UUID);
			}
		}
		
		return pList;
	},
}
