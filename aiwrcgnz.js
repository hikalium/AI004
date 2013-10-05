function AI_WordRecognition(env){
	this.env = env;
}
AI_WordRecognition.prototype = {
	slideLookUpCandidateWordByHistory: function(input){
		var h = this.env.input.historyList;
		var cList = new Array();
		for(var i = 0, iLen = input.length; i < iLen; i++){
			//input character loop
			var iStr = input.substr(i);
			var cLen = 0;
			var cStr = "";
			for(var j = 0, jLen = h.length; j < jLen; j++){
				//history entry loop
				var hStrBase = h[j];
				for(var k = 0, kLen = hStrBase.length; k < kLen; k++){
					//history character loop
					var hStr = hStrBase.substr(k);
					var m = hStr.compareLeftHand(iStr);
					if(m > cLen && m != iStr.length){
						cLen = m;
					}
				}
			}
			if(cLen > 0){
				cList.pushUnique(new AI_CandidateWordTag(iStr.substr(0, cLen))).wordCount++;
			}
		}
		//フィルター
		this.filterCandidateWordList00(cList);
		this.filterCandidateWordList01(cList, 2);
		//追加
		this.mergeCandidateWordList(cList);
	},
	appendCandidateWordList: function(strTag){
		var s = this.env.memory.candidateWordList.isIncluded(strTag, function(a, b){ return (a.str == b.str); });
		if(s){
			s.wordCount++;
		} else{
			strTag.wordCount = 1;
			this.env.memory.appendMemoryTag(strTag);
		}
	},
	mergeCandidateWordList: function(strTagList){
		for(var i = 0, iLen = strTagList.length; i < iLen; i++){
			this.appendCandidateWordList(strTagList[i]);
		}
	},
	debugShowCandidateWordList: function(){
		this.env.debug("candidateWordList:\n");
		var c = this.env.memory.candidateWordList;
		for(var i = 0, iLen = c.length; i < iLen; i++){
			this.env.debug(c[i].wordCount.toString() + " :" + c[i].wordLevel.toString() + " :" + c[i].str + "\n");
		}
		this.env.debug("candidateWordList end\n");
	},
	filterCandidateWordList00:function(cList){
		//00:長い単語に含まれており、かつ出現頻度が長い単語と等しい単語を削除
		//cList内の候補単語に対して、フィルターをかける。
		var iLen = cList.length;
		if(iLen < 1){
			return;
		}
		var baseStrTag = cList[0];
		for(var i = 1; i < iLen; i++){
			var c = cList[i];
			if(baseStrTag.str.indexOf(c.str) != -1){
				//c.strはbaseStrTag.strに含まれている
				if(baseStrTag.wordCount == c.wordCount){
					//かつ出現回数が等しいので不要な単語
					//後で削除する。出現回数を0にマークする。
					c.wordCount = 0;
				}
			}
			if(c.wordCount > 0){
				//単語は削除されなかった、つまり異なる単語なので、baseStrTagを更新
				var baseStrTag = c;
			}
		}
		//削除処理
		for(var i = 1; i < iLen; i++){
			var c = cList[i];
			if(c.wordCount == 0){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	filterCandidateWordList01:function(cList, minLen){
		//01:minLenに満たない文字数の候補を削除
		//削除処理
		var iLen = cList.length;
		for(var i = 0; i < iLen; i++){
			if(cList[i].str.length < minLen){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	filterCandidateWordList02:function(cList, minCount){
		//02:minCountに満たない出現回数の候補を削除
		//削除処理
		var iLen = cList.length;
		for(var i = 0; i < iLen; i++){
			if(cList[i].wordCount < minCount){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	sortCandidateWordListByWordCount: function(){
		this.env.memory.candidateWordList.stableSort(function(a, b){
			return a.wordCount - b.wordCount;
		});
	},
	sortCandidateWordListByWordLevel: function(){
		this.env.memory.candidateWordList.stableSort(function(a, b){
			return a.wordLevel - b.wordLevel;
		});
	},
	computeWordLevel: function(strTag){
		var s = strTag.str;
		var iLen = s.length;
		var f = 0;
		strTag.wordLevel = 0;
		//文字列中の文字種数を数える
		for(var i = 0; i < iLen; i++){
			if(s.isHiraganaAt(i)){
				f |= 0x01;
			} else if(s.isKanjiAt(i)){
				f |= 0x02;
			} else if(s.isKatakanaAt(i)){
				f |= 0x04;
			} else if(s.isHankakuKanaAt(i)){
				f |= 0x08;
			} else{
				f |= 0x10;
			}
		}
		for(var i = 0; i < 5; i++){
			if((f & 0x01) != 0){
				strTag.wordLevel++;
			}
			f >>>= 1;
		}
		strTag.wordLevel = 1 / strTag.wordLevel;
		return;
	},
	computeEachWordLevel: function(){
		var iLen = this.env.memory.candidateWordList.length;
		for(var i = 0; i < iLen; i++){
			this.computeWordLevel(this.env.memory.candidateWordList[i]);
		}
	}
}
