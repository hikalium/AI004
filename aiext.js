//
// クラス拡張
//

//継承機能
Function.prototype.extend = function(baseConstructor, newPrototype){
	// http://sourceforge.jp/projects/h58pcdgame/scm/git/GameScriptCoreLibrary/blobs/master/www/corelib/jsbase.js
	//最初にベースクラスのプロトタイプを引き継ぐ。
	var F = function(){};
	F.prototype = baseConstructor.prototype;
	this.prototype = new F();
	//新たなプロトタイプを追加・上書きする。
	if(newPrototype){
		for(var prop in newPrototype){
			this.prototype[prop] = newPrototype[prop];
		}
	}
	//コンストラクタを設定
	this.prototype.constructor = this;
	//ベースクラスのコンストラクタを設定
	this.base = baseConstructor;
	return this;
};

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
Array.prototype.removeAnObject = function(anObject){
	//Array中にある最初のanObjectを削除し、空いた部分は前につめる。
	//戻り値は削除が実行されたかどうか
	for(var i = 0; i < this.length; i++){
		if(this[i] == anObject){
			this.splice(i, 1);
			return true;
		}
	}
	return false;
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
}

Array.prototype.splitByArray = function(separatorList){
	//Array中の文字列をseparatorList内の文字列でそれぞれで分割し、それらの文字列が含まれた配列を返す。
	var retArray = new Array();
	
	for(var i = 0, iLen = this.length; i < iLen; i++){
		retArray = retArray.concat(this[i].splitByArray(separatorList));
	}
	
	return retArray;
}

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
	//separatorはそれ以前の文字列の末尾に追加された状態で含まれる。
	//"abcdefg".splitByArray(["a", "e", "g"]);
	//	= ["a", "bcde", "fg"]
	var retArray = new Array();
	retArray[0] = this;
	
	for(var i = 0; i < separatorList.length; i++){
		var tmpArray = new Array();
		for(var k = 0; k < retArray.length; k++){
			tmpArray[k] = retArray[k].split(separatorList[i]);
			if(tmpArray[k][tmpArray[k].length - 1] == ""){
				tmpArray[k].splice(tmpArray[k].length - 1, 1);
				if(tmpArray[k] && tmpArray[k].length > 0){
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

String.prototype.splitByArraySeparatorSeparated = function(separatorList){
	//リスト中の文字列それぞれで分割された配列を返す。
	//separatorも分割された状態で含まれる。
	//"abcdefg".splitByArraySeparatorSeparated(["a", "e", "g"]);
	//	= ["a", "bcd", "e", "f", "g"]
	var retArray = new Array();
	retArray[0] = this;
	
	for(var i = 0; i < separatorList.length; i++){
		var tmpArray = new Array();
		for(var k = 0; k < retArray.length; k++){
			var tmpArraySub = retArray[k].split(separatorList[i]);
			tmpArray[k] = new Array();
			for(var m = 0, mLen = tmpArraySub.length - 1; m < mLen; m++){
				if(tmpArraySub[m] != ""){
					tmpArray[k].push(tmpArraySub[m]);
				}
				tmpArray[k].push(separatorList[i]);
			}
			if(tmpArraySub[tmpArraySub.length - 1] != ""){
				tmpArray[k].push(tmpArraySub[m]);
			}
		}
		retArray = new Array();
		retArray = retArray.concat.apply(retArray, tmpArray);
	}
	
	return retArray;
}

String.prototype.splitByArraySeparatorSeparatedLong = function(separatorList){
	//リスト中の文字列それぞれで分割された配列を返す。
	//separatorも分割された状態で含まれる。
	//separatorListの前の方にあるseparatorは、後方のseparatorによって分割されない。
	//"abcdefgcdefg".splitByArraySeparatorSeparatedLong(["bcde", "cd", "f"]);
	//	= ["a", "bcde", "f", "g", "cd", "e", "f", "g"]
	//"for (i = 0; i != 15; i++) {".splitByArraySeparatorSeparatedLong(["!=", "(", ")", "="]);
	//	= ["for ", "(", "i ", "=", " 0; i ", "!=", " 15; i++", ")", " {"]
	var retArray = new Array();
	var checkArray = new Array();
	retArray[0] = this;
	checkArray[0] = false;
	
	for(var i = 0; i < separatorList.length; i++){
		var tmpArray = new Array();
		var tmpCheckArray = new Array();
		for(var k = 0; k < retArray.length; k++){
			if(!checkArray[k]){
				var tmpArraySub = retArray[k].split(separatorList[i]);
				tmpArray[k] = new Array();
				tmpCheckArray[k] = new Array();
				for(var m = 0, mLen = tmpArraySub.length - 1; m < mLen; m++){
					if(tmpArraySub[m] != ""){
						tmpArray[k].push(tmpArraySub[m]);
						tmpCheckArray[k].push(false);
					}
					tmpArray[k].push(separatorList[i]);
					tmpCheckArray[k].push(true);
				}
				if(tmpArraySub[tmpArraySub.length - 1] != ""){
					tmpArray[k].push(tmpArraySub[m]);
					tmpCheckArray[k].push(false);
				}
			} else{
				tmpArray.push([retArray[k]]);
				tmpCheckArray.push([true]);
			}
		}
		retArray = new Array();
		checkArray = new Array();
		retArray = retArray.concat.apply(retArray, tmpArray);
		checkArray = checkArray.concat.apply(checkArray, tmpCheckArray);
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
