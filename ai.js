//AI004

//
// クラス拡張
//

//配列関連
Array.prototype.removeAllObject = function(anObject){
	//Array中にある全てのanObjectを削除し、空いた部分は前につめる。
	//戻り値は削除が一回でも実行されたかどうか
	var ret = false;
	for(var i = 0; i < this.length; i++){
		if(this[i] == anObject){
			this.splice(i, 1);
			ret = true;
			i--;
		}
	}
	return ret;
}
Array.prototype.removeByIndex = function(index){
	//Array[index]を削除し、空いた部分は前につめる。
	this.splice(index, 1);
	return;
}
Array.prototype.intersectionWith = function(a, b, fEqualTo){
	//積集合を求める
	//fEqualToは省略可能で、評価関数fEqualTo(a[i], b[j])を設定する。
	var r = new Array();
	for(var i = 0, len = b.length; i < len; i++){
		if(this.isIncluded(b[i], fEqualTo)){
			r.push(b[i]);
		}
	}
	return r;
}
Array.prototype.unionWith = function(a, b, fEqualTo){
	//和集合を求める
	//fEqualToは省略可能で、評価関数fEqualTo(a[i], b[j])を設定する。
	var r = new Array();
	for(var i = 0, len = b.length; i < len; i++){
		if(!this.isIncluded(b[i], fEqualTo)){
			r.push(b[i]);
		}
	}
	return this.concat(r);
}
Array.prototype.isIncluded = function(obj, fEqualTo){
	//含まれている場合は配列内のそのオブジェクトを返す
	//fEqualToは省略可能で、評価関数fEqualTo(array[i], obj)を設定する。
	if(fEqualTo == undefined){
		for(var i = 0, len = this.length; i < len; i++){
			if(this[i] == obj){
				return this[i];
			}
		}
	} else{
		for(var i = 0, len = this.length; i < len; i++){
			if(fEqualTo(this[i], obj)){
				return this[i];
			}
		}
	}
	return false;
}
Array.prototype.pushUnique = function(obj, fEqualTo){
	//値が既に存在する場合は追加しない。評価関数fEqualTo(array[i], obj)を設定することができる。
	//結果的に配列内にあるオブジェクトが返される。
	var o = this.isIncluded(obj, fEqualTo);
	if(!o){
		this.push(obj);
		return obj;
	}
	return o;
}
Array.prototype.stableSort = function(f){
	// http://blog.livedoor.jp/netomemo/archives/24688861.html
	// Chrome等ではソートが必ずしも安定ではないので、この関数を利用する。
	if(f == undefined){
		f = function(a,b){ return a - b; };
	}
	for(var i = 0; i < this.length; i++){
		this[i].__id__ = i;
	}
	this.sort.call(this, function(a,b){
		var ret = f(a, b);
		if(ret == 0){
			return (a.__id__ > b.__id__) ? 1 : -1;
		} else{
			return ret;
		}
	});
	for(var i = 0;i < this.length;i++){
		delete this[i].__id__;
	}
};

//文字列関連
String.prototype.replaceAll = function(org, dest){
	//String中にある文字列orgを文字列destにすべて置換する。
	//http://www.syboos.jp/webjs/doc/string-replace-and-replaceall.html
	return this.split(org).join(dest);
}
String.prototype.compareLeftHand = function (search){
	//前方一致長を求める。
	for(var i = 0; search.charAt(i) != ""; i++){
		if(search.charAt(i) != this.charAt(i)){
			break;
		}
	}
	return i;
}
String.prototype.splitByArray = function(separatorList){
	//リスト中の文字列それぞれで分割された配列を返す。
	var retArray = new Array();
	retArray[0] = this;
	
	for(var i = 0; i < separatorList.length; i++){
		var tmpArray = new Array();
		for(var k = 0; k < retArray.length; k++){
			tmpArray[k] = retArray[k].split(separatorList[i]);
			if(tmpArray[k][tmpArray[k].length - 1] == ""){
				tmpArray[k].splice(tmpArray[k].length - 1, 1);
				if(tmpArray[k] && tmpArray.length > 0){
					for(var m = 0; m < tmpArray[k].length; m++){
						tmpArray[k][m] += separatorList[i];
					}
				}
			} else{
				for(var m = 0; m < tmpArray[k].length - 1; m++){
					tmpArray[k][m] += separatorList[i];
				}
			}
		}
		retArray = new Array();
		retArray = retArray.concat.apply(retArray, tmpArray);
	}
	
	return retArray;
}
String.prototype.trim = function(str){
	return this.replace(/^[ 　	]+|[ 　	]+$/g, "").replace(/\n$/g, "");
}
//http://d.hatena.ne.jp/favril/20090514/1242280476
String.prototype.isKanjiAt = function(index){
	var u = this.charCodeAt(index);
	if( (0x4e00  <= u && u <= 0x9fcf) ||	// CJK統合漢字
		(0x3400  <= u && u <= 0x4dbf) ||	// CJK統合漢字拡張A
		(0x20000 <= u && u <= 0x2a6df) ||	// CJK統合漢字拡張B
		(0xf900  <= u && u <= 0xfadf) ||	// CJK互換漢字
		(0x2f800 <= u && u <= 0x2fa1f)){ 	// CJK互換漢字補助
		return true;
	}
    return false;
}
String.prototype.isHiraganaAt = function(index){
	var u = this.charCodeAt(index);
	if(0x3040 <= u && u <= 0x309f){
		return true;
	}
	return false;
}
String.prototype.isKatakanaAt = function(index){
	var u = this.charCodeAt(index);
	if(0x30a0 <= u && u <= 0x30ff){
		return true;
	}
	return false;
}
String.prototype.isHankakuKanaAt = function(index){
	var u = this.charCodeAt(index);
	if(0xff61 <= u && u <= 0xff9f){
		return true;
	}
	return false;
}

//
// メインクラス
//

function AI(){
	//サブクラス
	this.input = new AI_Input(this);
	this.wordRecognition = new AI_WordRecognition(this);
	//出力関連
	this.outputTimer = null;
	this.messageBox = null;
	this.messageBoxBuffer = "";
	this.maxMessageStringLength = 0xffffff;
	this.debugBox = null;
	this.debugBoxBuffer = "";
	this.maxDebugStringLength = 0xffff;
	
}
AI.prototype = {
	sendToAI: function(str){
		this.debug("**** Start thinking ****\n");
		this.debug("input:[" + str + "]\n");
		this.input.appendInput(str);
		for(;;){
			var s = this.input.getSentence();
			if(s === undefined){
				break;
			}
			this.message(s + "\n");
		}
		this.wordRecognition.sortCandidateWordListByWordCount();
		this.wordRecognition.computeEachWordLevel();
		this.wordRecognition.sortCandidateWordListByWordLevel();
		this.wordRecognition.debugShowCandidateWordList();
		this.debug("**** End thinking ****\n");
	},
	setMessageBoxDOMObject: function(mBoxObj){
		this.messageBox = mBoxObj;
		this.setOutputTimer();
	},
	setDebugBoxDOMObject: function(dBoxObj){
		this.debugBox = dBoxObj;
		this.setOutputTimer();
	},
	message: function(str){
		if(this.messageBox){
			this.messageBoxBuffer += "AI> " + str;
		}
	},
	debug: function(str){
		if(this.debugBox){
			this.debugBoxBuffer += str;
		}
	},
	outputShowTick: function(){
		if(this.messageBox && this.messageBoxBuffer != ""){
			//messageBox
			var str = this.messageBox.innerHTML + this.messageBoxBuffer;
			this.messageBoxBuffer = "";
			if(str.length > this.maxMessageStringLength){
				str = str.slice(str.length - (this.maxMessageStringLength >> 1));
			}
			this.messageBox.innerHTML = str;
			this.messageBox.scrollTop = this.messageBox.scrollHeight;
		}
		if(this.debugBox && this.debugBoxBuffer != ""){
			//debugBox
			var str = this.debugBox.innerHTML + this.debugBoxBuffer;
			this.debugBoxBuffer = "";
			if(str.length > this.maxDebugStringLength){
				str = str.slice(str.length - (this.maxDebugStringLength >> 1));
			}
			this.debugBox.innerHTML = str;
			this.debugBox.scrollTop = this.debugBox.scrollHeight;
		}
	},
	setOutputTimer: function(){
		if(!this.messageBox && !this.debugBox){
			//すべて無効だったらタイマーの動作自体を止める
			window.clearTimeout(this.outputTimer);
			this.outputTimer = null;
		} else if(!this.outputTimer){
			//どれかが有効でかつタイマーが止まっていたらスタートさせる
			var that = this;
			this.outputTimer = window.setInterval(function(){that.outputShowTick();}, 50);
		}
	},
}

//
//サブクラス
//

function AI_WordRecognition(env){
	this.env = env;
	this.candidateWordList = new Array();
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
				cList.pushUnique(new AI_WordTag(iStr.substr(0, cLen))).wordCount++;
			}
		}
		//フィルター
		this.filterCandidateWordList00(cList);
		this.filterCandidateWordList01(cList, 2);
		//追加
		this.mergeCandidateWordList(cList);
	},
	appendCandidateWordList: function(strTag){
		var s = this.candidateWordList.isIncluded(strTag, function(a, b){ return (a.str == b.str); });
		if(s){
			s.wordCount++;
		} else{
			strTag.wordCount = 1;
			this.candidateWordList.push(strTag);
		}
	},
	mergeCandidateWordList: function(strTagList){
		for(var i = 0, iLen = strTagList.length; i < iLen; i++){
			this.appendCandidateWordList(strTagList[i]);
		}
	},
	debugShowCandidateWordList: function(){
		this.env.debug("candidateWordList:\n");
		var c = this.candidateWordList;
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
		this.candidateWordList.stableSort(function(a, b){
			return a.wordCount - b.wordCount;
		});
	},
	sortCandidateWordListByWordLevel: function(){
		this.candidateWordList.stableSort(function(a, b){
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
		var iLen = this.candidateWordList.length;
		for(var i = 0; i < iLen; i++){
			this.computeWordLevel(this.candidateWordList[i]);
		}
	}
}

function AI_WordTag(str){
	this.str = str;
	this.wordCount = 0;
	this.wordLevel = 0;
}

function AI_Input(env){
	this.env = env;
	this.historyList = new Array();
	this.sentenceList = new Array();
}
AI_Input.prototype = {
	maxHistoryLength: 32,
	sentenceSeparator: [
		"。",
		"！",
		"？",
		"!",
		"?",
		"\n",
	],
	appendInput: function(str){
		var sList = str.splitByArray(this.sentenceSeparator);
		
		this.sentenceList = this.sentenceList.concat(sList)
	},
	getSentence: function(){
		//改行のみの文は破棄
		for(;;){
			if(this.sentenceList.length <= 0){
				return undefined;
			}
			var retv = this.sentenceList[0];
			this.sentenceList.splice(0, 1);
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
