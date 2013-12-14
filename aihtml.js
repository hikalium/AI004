function AI_HTMLParser(env){
	this.env = env;
	this.mainString = "";
	//[[linkURL, dispString],...]
	this.linkList = new Array();
}
AI_HTMLParser.prototype = {
	keywordList0:[
		//タグ抽出用
		"</",
		"<",
		">",
	],
	keywordList1:[
		//タグ属性抽出用
		"\\\"",
		"\"",
		"'",
		"=",
		" ",
	],
	loadText: function(src){
		if(!src){
			return;
		}
		this.mainString = "";
		this.linkList = new Array();
	
		src.replaceAll("\n", "");
		var a = src.splitByArraySeparatorSeparatedLong(this.keywordList0);
		var currentTag;
		var s;
		var mode = 0;
		var appendDisabled = false;
		var linkInfo = null;
		var attr;
		//0:何が来てもOK
		//1:タグの中身か閉じ括弧
		for(var i = 0, iLen = a.length; i < iLen; i++){
			s = a[i];
			if(mode == 0){
				if(s == "<"){
					//開始タグの開始
					mode = 1;
					currentTag = a[i + 1].trim().split(" ")[0];
					if(currentTag == "br"){
						//<br />
						this.mainString += "\n";
						//this.env.debug("<" + currentTag + " />\n");
					} else if(currentTag == "script" || currentTag == "style"){
						//内部を無視するタグ
						appendDisabled = true;
					} else if(currentTag == "a"){
						//リンク
						linkInfo = ["", ""];
						attr = this.getAttributesFromTagString(a[i + 1].substring(currentTag.length));
						linkInfo[0] = attr.search2DObject(0, 1, "href");
					} else{
						//this.env.debug("<" + currentTag + ">\n");
					}
				} else if(s == "</"){
					//終了タグの開始
					mode = 1;
					currentTag = a[i + 1].trim().split(" ")[0];
					//this.env.debug("</" + currentTag + ">\n");
					if(currentTag == "script" || currentTag == "style"){
						appendDisabled = false;
					} else if(currentTag == "a" && linkInfo){
						this.linkList.push(linkInfo);
						linkInfo = null;
					}
				} else if(!appendDisabled){
					this.mainString += s;
					if(linkInfo){
						linkInfo[1] += s;
					}
				}
			} else if(mode == 1){
				if(s == ">"){
					mode = 0;
				}
			}
		}
		return this.mainString;
	},
	getAttributesFromTagString: function(tagStr){
		var a = tagStr.splitByArraySeparatorSeparatedLong(this.keywordList1);
		var s;
		var t = [undefined, ""];
		var mode = 0;
		var retArray = new Array();
		var inStringLiteral = false;
		for(var i = 0, iLen = a.length; i < iLen; i++){
			s = a[i];
			if(s == " " || s == "\\\"" || s == "'"){
				if(mode == 1 && inStringLiteral){
					t[1] += s;
				}
			} else if(s == "\""){
				inStringLiteral = !inStringLiteral;
				if(!inStringLiteral){
					retArray.push(t);
					t = [undefined, ""];
					mode = 0;
				}
			} else if(s == "="){
				if(mode == 1 && inStringLiteral){
					t[1] += s;
				}
				mode = 1;
			} else{
				if(mode == 0){
					//左辺
					t[0] = s;
				} else if(mode == 1){
					//右辺
					t[1] += s;
				}
			}
		}
		//console.log(retArray);
		return retArray;
	},
}