// ELCHNOSCompiler for AI004

//手順:
//トークン分割
//構造解析・式の逆ポーランド化
//中間バイナリ化

function ELCHNOSCompiler(env){
	this.env = env;
	
	this.unexpected = false;
	this.errno = 0;
	this.errLine = 0;
	
	this.line = null;
	this.separated = null;
	this.bin = new Array();
	
	this.structure = new Array();
	this.currentStructure = this.structure;
	this.structureStack = new Array();
	
	//0はエントリポイント(main)用に予約
	this.nextLabelID = 1;
	this.integerRegisterAllocationTable = new Array();
	this.pointerRegisterAllocationTable = new Array();
}
ELCHNOSCompiler.prototype = {
	keyWordList: [
		"@asm",
		"@end",
		"//",
		"/*",
		"*/",
		"!=",
		"==",
		"+=",
		"-=",
		"*=",
		"/=",
		"<=",
		"++",
		"--",
		"\n",
		"\t",
		" ",
		"{",
		"}",
		"(",
		")",
		";",
		",",
		"[",
		"]",
		"=",
		"+",
		"-",
		"*",
		"/",
	],
	errorMessageList: [
		"Trap.",
		"Incompatible value attribute.",
		"Unexpected identifier.",
		"Unknown assembly language type.",
		"Invalid expression of OSECPU Binary.",
		"Binary translation error.",
	],
	
	Flag_Sign_Signed			: 0x00000001,
	Flag_Sign_Unsigned			: 0x00000002,
	
	compile: function(str){
		this.line = str.split("\n");
		//分割
		this.separated = str.splitByArraySeparatorSeparatedLong(this.keyWordList);
		//コメント除去
		this.compile_removeComment();
		
		//不要な文字を削除
		this.separated.removeAllObject("\t");
		this.separated.removeAllObject(" ");
		
		console.log(this.separated);
		
		//メイン処理
		this.errno = 2;
		var currentExpression = null;
		var numValSignFlag = 0;
		var numValBits = 0;
		var pointerCount = 0;
		var lineCount = 1;
		var mode = 0;
		var o;
		var f;
			//次に期待する値を示す。
			// 0: 何が来るかわからない
			//
			//10: 変数・定数の前置属性・型・または識別子
			//11: 変数・定数の識別子またはポインタ属性
			//12: 変数・定数の後置属性・初期化式または終端記号、もしくは連続した変数宣言の区切り
			//13: 変数・定数の初期化式または終端記号、もしくは連続した変数宣言の区切り
			//14: 配列長の数値部分
			//15: 配列長指定終了の閉じ括弧
			//16: 初期化式の開始括弧もしくは値
			//17: 初期化式の値部分または終了括弧
			//18: 初期化式の区切りまたは終了括弧
			//19: 終端記号
			//
			//50: 関数名または関数属性
			//51: 引数開始括弧
			//52: 引数or引数終了括弧
			//53: 引数区切りor引数終了括弧
			//54: 関数内部開始括弧
			//
			//60: 評価式の内容または終端記号
			//
			//70: OSECPUアセンブリ直接記述モード
			//71: OSECPUアセンブリ評価式の内容または終端記号
		for(var i = 0, iLen = this.separated.length; i < iLen; i++){
			var s = this.separated[i].toLowerCase();
			
			if(s == "\n"){
				//デバッグ用行数カウント
				lineCount++;
				continue;
			//予約語
			} else if(s == "signed" && (mode == 0 || mode == 10)){
				//符号あり
				if(numValSignFlag == 0){
					numValSignFlag |= this.Flag_Sign_Signed;
					mode = 10;
				} else{
					this.unexpected = true;
					this.errno = 1;
				}
			} else if(s == "unsigned" && (mode == 0 || mode == 10)){
				//符号なし
				if(numValSignFlag == 0){
					numValSignFlag |= this.Flag_Sign_Unsigned;
					mode = 10;
				} else{
					this.unexpected = true;
					this.errno = 1;
				}
			} else if(s == "char"  && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
				//char 8bit符号あり
				numValBits = 8;
				if(mode == 0 || mode == 10 || mode == 11){
					mode = 11;
				}
			} else if(s == "int" && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
				//int 32bit符号あり
				numValBits = 32;
				if(mode == 0 || mode == 10 || mode == 11){
					mode = 11;
				}
			} else if(s == ";" && (mode == 0 || mode == 12 || mode == 13 || mode == 19 || mode == 60 || mode == 71)){
				if(mode == 12 || mode == 13 || mode == 19){
					//変数または定数の定義終了
					numValBits = 0;
					numValSignFlag = 0;
					//console.log(currentExpression);
					currentExpression = null;
					mode = 0;
				} else if(mode == 60 || mode == 71){
					//評価式終端
					//console.log(currentExpression);
					currentExpression = null;
					if(mode == 60){
						mode = 0;
					} else if(mode == 71){
						mode = 70;
					}
				} else{
					this.unexpected = true;
				}
			} else if(s == "=" && (mode == 13)){
				if(mode == 13){
					//変数・定数初期化式開始
					mode = 16;
				} else{
					this.unexpected = true;
				}
			} else if(s == "*" && (mode == 11)){
				//ポインタ属性の付加
				pointerCount++;
			} else if(s == "," && (mode == 18 || mode == 12 || mode == 13 || mode == 53)){
				if(mode == 18){
					//初期化式の区切り
					mode = 17;
				} else if(mode == 12 || mode == 13 || mode == 53){
					//連続した変数宣言の区切り
					if(mode == 12 || mode == 13){
						mode = 11;
					} else if(mode == 53){
						mode = 52;
					}
					//console.log(currentExpression);
					currentExpression = null;
				} else{
					this.unexpected = true;
				}
			//括弧系
			} else if(s == "[" && (mode == 12)){
				//配列の長さの定義開始
				mode = 14;
			} else if(s == "]" && (mode == 15)){
				//配列の長さの定義終了
				mode = 13;
			} else if(s == "{" && (mode == 16 || mode == 54)){
				if(mode == 16){
					//初期化式の開始括弧
					mode = 17;
				} else if(mode == 54){
					//54: 関数内部開始括弧
					currentExpression = null;
					mode = 0;
				} else{
					this.unexpected = true;
				}
			} else if(s == "}" && (mode == 17 || mode == 18 || mode == 0)){
				if(mode == 17 || mode == 18){
					//初期化式の終了括弧
					mode = 19;
				} else if(mode == 0){
					if(this.structureStack.length > 0){
						//console.log(this.currentStructure);
						this.restoreCurrentStructure();
					} else{
						this.unexpected = true;
					}
				}
			} else if(s == "(" && (mode == 51)){
				//51: 引数開始括弧
				mode = 52;
			} else if(s == ")" && (mode == 52 || mode == 53)){
				//52: 引数or引数終了括弧
				//53: 引数区切りor引数終了括弧
				//console.log(currentExpression);
				currentExpression = null;
				for(var j = 0, jLen = this.currentStructure.length; j < jLen; j++){
					//引数番号を付与
					this.currentStructure[j].argumentIndex = j;
				}
				mode = 54;
			} else if(s == "@asm" && (mode == 0)){
				i++;
				s = this.separated[i].toLowerCase();
				if(s == "osecpu"){
					mode = 70;
				} else{
					this.unexpected = true;
					this.errno = 3;
				}
			} else if(s == "@end" && (mode == 70)){
				mode = 0;
			//リストにない予約語
			} else if(s == "procedure" && (mode == 0)){
				//関数宣言
				var f = new ELCHNOSCompiler_ExpressionStructure_Function(this, lineCount);
				this.currentStructure.push(f);
				this.changeCurrentStructure(f.structure);
				currentExpression = f;
				
				mode = 50;
			} else if(s == "inline" && (mode == 50)){
				currentExpression.isInline = true;
			} else if(s == "for" && (mode == 0)){
				//forループ
				i++;
				s = this.separated[i];
				if(s == "("){
					var f = new ELCHNOSCompiler_ExpressionStructure_Loop_for(this, lineCount);
					this.currentStructure.push(f);
					this.changeCurrentStructure(f.structure);
					currentExpression = f;
					//初期化式
					f.initializer = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
					i = f.initializer.readExpressionToTerminator(i, ";");
					//条件評価式
					if(!this.unexpected){
						f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.conditonalExpression.readExpressionToTerminator(i, ";");
					}
					//更新式
					if(!this.unexpected){
						f.incrementalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						i = f.incrementalExpression.readExpressionToTerminator(i, ")");
					}
					//開始括弧
					if(!this.unexpected){
						i++;
						if(this.separated[i] != "{"){
							this.unexpected = true;
						}
						currentExpression = null;
					}
				} else{
					this.unexpected = true;
				}
			} else if(s == "if" && (mode == 0)){
				//if文
				//条件評価式-?>L2
				//実行部分
				//(break->L2)
				//L2:
				i++;
				s = this.separated[i];
				if(s == "("){
					var f = new ELCHNOSCompiler_ExpressionStructure_if(this, lineCount);
					this.currentStructure.push(f);
					this.changeCurrentStructure(f.structure);
					currentExpression = f;
					//条件評価式
					f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
					i = f.conditonalExpression.readExpressionToTerminator(i, ")");
					//開始括弧
					if(!this.unexpected){
						i++;
						if(this.separated[i] != "{"){
							this.unexpected = true;
						}
						currentExpression = null;
					}
				} else{
					this.unexpected = true;
				}
			//OSECPUアセンブリ
			} else if(s == "remark" && (mode == 70)){
				//超手抜き
				var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this, lineCount);
				this.currentStructure.push(b);
				//FE	len	...
				b.bin.push(0xfe);
				//len
				i++;
				s = this.separated[i];
				if(s.length == 2){
					var len = parseInt(s, 16);
					b.bin.push(len);
				} else{
					this.unexpected = true;
					this.errno = 4;
				}
				//data
				if(!this.unexpected){
					i++;
					s = this.separated[i];
					if(s.length == len * 2){
						for(var j = 0; j < len; j++){
							b.bin.push(parseInt(s.substr(j * 2, 2), 16));
						}
					} else{
						this.unexpected = true;
						this.errno = 4;
					}
				}
				
				if(!this.unexpected){
					i++;
					if(this.separated[i] != ";"){
						this.unexpected = true;
					} else{
						//この命令は定数のみで構成されているのでコンパイル済みとマークする
						b.isCompiled = true;
						b = null;
					}
				}
			} else if(s == "call" && (mode == 70)){
				//超手抜き
				var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this, lineCount);
				this.currentStructure.push(b);
				
				//第二引数が何か確認する
				i++;
				s = this.separated[i].toLowerCase();
				if((s.indexOf("p") == 0) && s.length == 3){
					//ポインタレジスタをcall
					//新しいラベル番号をもらう
					var labelID = this.allocateLabelID();
					//PLIMM(P30, labelID)
						//03	reg0	imm32
					b.bin.push(0x03);
					b.bin.push(0x30);
					b.appendInstruction_UINT32BE(labelID);
					//PCP(P3F, Pxx)
						//1E	reg0P	reg1P
					b.bin.push(0x1e);
					b.bin.push(0x3f);
					b.bin.push(parseInt(s.substr(1),16));
					
					b.appendInstruction_LB(0x01, labelID);
					//[FE] [01] [00]
					b.bin.push(0xfe);
					b.bin.push(0x01);
					b.bin.push(0x00);
					//終端記号
					i++;
					if(this.separated[i] != ";"){
						this.unexpected = true;
					} else{
						//この命令は定数のみで構成されているのでコンパイル済みとマークする
						b.isCompiled = true;
						b = null;
					}
				} else{
					this.unexpected = true;
					this.errno = 0;
				}
			//予約語以外
			} else if(mode == 11 || mode == 52){
				//変数または定数の宣言
				//52: 引数名
				var v = new ELCHNOSCompiler_ExpressionStructure_Variable(this, lineCount);
				v.bits = numValBits;
				v.isSigned = (numValSignFlag == 0) ? false : (0 != (numValSignFlag & this.Flag_Sign_Signed));
				s = this.separated[i];
				v.isPointer = (pointerCount != 0) ? true : false;
				pointerCount = 0;
				if(s.length > 0){
					v.identifier = s;
					
					this.currentStructure.push(v);
					currentExpression = v;
					
					//mode:11->12
					//mode:52->53
					mode++;
				} else{
					this.unexpected = true;
				}
			} else if(mode == 14){
				currentExpression.length = parseInt(s);
				mode = 15;
			} else if(mode == 17){
				//定数値のみ対応
				currentExpression.initValue.push(parseInt(s));
				mode = 18;
			} else if(mode == 50){
				//関数名
				//大文字小文字を区別
				currentExpression.identifier = this.separated[i];
				mode = 51;
			} else{
				if(mode == 0 || mode == 70 || mode == 60 || mode == 71){
					//大文字小文字を区別
					s = this.separated[i];
					if(mode == 0 || mode == 70){
						//最初の左辺だったら追加処理
						var f = new ELCHNOSCompiler_ExpressionStructure_Expression(this, lineCount);
						this.currentStructure.push(f);
						currentExpression = f;
					}
					currentExpression.pushIdentifier(s);
					if(!this.unexpected){
						if(mode == 0){
							mode = 60;
						} else if(mode == 70){
							mode = 71;
						}
					}
				}
			}
			if(this.unexpected){
				//期待されていない値
				s = this.separated[i];
				this.raiseError(this.errno, lineCount, [s, mode]);
				console.log(this.structure);
				return;
			}
		}
		console.log(this.structure);
		
		//中間バイナリ生成
		//バックエンドコードの中間表現を出力。
		//0x00-0xff: そのまま使えるバイナリ
		//0x10000000-0x1fffffff: 未決定の仮想整数レジスタ番号
		//0x20000000-0x2fffffff: 未決定の仮想ポインタレジスタ番号
		this.errno = 5;
		
		//OSECPUフロントエンドコードヘッダ
		this.bin.push(0x05, 0xe1, 0x00);
		
		for(var i = 0, iLen = this.structure.length; i < iLen; i++){
			var b = this.structure[i].createBinary();
			if(b !== undefined){
				this.bin.push(b);
			}
			if(this.unexpected){
				if(!this.errLine){
					this.errLine = this.structure[i].lineCount;
				}
				this.raiseError(this.errno, this.errLine, null);
				console.log(this.bin);
				return;
			}
		}
		
		this.expandBinaryString();
		this.assignRegister();
		this.bin.logAsHexByte();
		this.saveBinary();
		
		console.log(this.bin);
	},
	compile_removeComment: function(){
		//コメント削除
		var commentLineStartIndex = -1;
		var commentBlockStartIndex = -1;
		var commentBlockCount = 0;
		var linesInCommentBlock = 0;
		
		for(var i = 0, iLen = this.separated.length; i < iLen; i++){
			var s = this.separated[i];
			if(commentLineStartIndex == -1){
				if(s == "//"){
					//行コメント開始
					commentLineStartIndex = i;
				}
			} else{
				if(s == "\n"){
					//行コメント終了
					var len = i - commentLineStartIndex;
					this.separated.splice(commentLineStartIndex, len);
					iLen -= len;
					i -= len;
					commentLineStartIndex = -1;
				}
			}
			if(s == "/*"){
				//ブロックコメント開始
				if(commentBlockCount == 0){
					commentBlockStartIndex = i;
				}
				commentBlockCount++;
			} else if(s == "*/"){
				//ブロックコメント終了
				commentBlockCount--;
				if(commentBlockCount == 0){
					var len = i - commentBlockStartIndex + 1;
					var padding = new Array();
					padding.push(commentBlockStartIndex);
					padding.push(len);
					for(var j = 0, jLen = linesInCommentBlock; j < jLen; j++){
						padding.push("\n");
					}
					this.separated.splice.apply(this.separated, padding);
					i -= len - linesInCommentBlock;
					iLen -= len - linesInCommentBlock;
					linesInCommentBlock = 0;
				} else if(commentBlockCount < 0){
					this.env.debug("Too many block comment closure [].\n");
					return;
				}
			} else if(commentBlockCount > 0 && s == "\n"){
				linesInCommentBlock++;
			}
		}
	},
	raiseError: function(errno, lineCount, infoArray){
		if(errno < 0 || this.errorMessageList.length <= errno){
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":Unknown\n");
		} else{
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":" + this.errorMessageList[errno] + "\n");
		}
		if(infoArray){
			this.env.debug("  >" + infoArray.toString() + "\n");
		}
	},
	changeCurrentStructure: function(newstructure){
		this.structureStack.push(this.currentStructure);
		this.currentStructure = newstructure;
	},
	restoreCurrentStructure: function(){
		this.currentStructure = this.structureStack.pop();
	},
	searchIdentifier: function(identifier){
		var o;
		var cf = function(aryobj, obj){ return (aryobj.identifier == obj) };
		
		o = this.currentStructure.isIncluded(identifier, cf);
		if(!o){
			for(var i = this.structureStack.length - 1; i >= 0; i--){
				o = this.structureStack[i].isIncluded(identifier, cf);
				if(o){
					break;
				}
			}
		}
		return o;
	},
	isOperator: function(s){
		return (
			s == "=" ||
			s == "+" ||
			s == "-" ||
			s == "*" ||
			s == "/" ||
			s == "!=" ||
			s == "++" ||
			s == "<" ||
			s == "(" ||
			s == ")"||
			s == "," ||
			false
		);
	},
	allocateLabelID: function(){
		this.nextLabelID++;
		return this.nextLabelID - 1;
	},
	virtualIntegerRegisterOffset: 0x10000000,
	allocateIntegerRegister: function(owner){
		//レジスタテーブルは先頭から番号の小さい順につめて格納する。
		//[regID, owner]
		//0x10000000-0x1fffffff: 未決定の仮想整数レジスタ番号
		var freeRegID = 0;
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][0] != i + this.virtualIntegerRegisterOffset){
				//空いているレジスタ番号を見つけた
				if(i > 0x20){
					this.integerRegisterAllocationTable.splice(i, 0, [i + this.virtualIntegerRegisterOffset, owner]);
				}
			}
		}
		if(i == iLen){
			//途中に空いているレジスタはなかったので追加
			this.integerRegisterAllocationTable.push([i + this.virtualIntegerRegisterOffset, owner]);
		}
		return i + this.virtualIntegerRegisterOffset;
	},
	freeIntegerRegister: function(regID, owner){
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][0] == regID){
				//レジスタ番号を見つけた
				//オーナーが一致するか確認
				if(this.integerRegisterAllocationTable[i][1] == owner){
					//一致したので解放する
					this.integerRegisterAllocationTable.splice(i, 1);
				}
				break;
			}
		}
		if(i == iLen){
			console.log("register free error.");
		}
	},
	virtualPointerRegisterOffset: 0x20000000,
	allocatePointerRegister: function(owner){
		//レジスタテーブルは先頭から番号の小さい順につめて格納する。
		//[regID, owner]
		//0x20000000-0x2fffffff: 未決定の仮想ポインタレジスタ番号
		var freeRegID = 0;
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][0] != i + this.virtualPointerRegisterOffset){
				//空いているレジスタ番号を見つけた
				this.pointerRegisterAllocationTable.splice(i, 0, [i + this.virtualPointerRegisterOffset, owner]);
			}
		}
		if(i == iLen){
			//途中に空いているレジスタはなかったので追加
			this.pointerRegisterAllocationTable.push([i + this.virtualPointerRegisterOffset, owner]);
		}
		return i + this.virtualPointerRegisterOffset;
	},
	freePointerRegister: function(regID, owner){
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][0] == regID){
				//レジスタ番号を見つけた
				//オーナーが一致するか確認
				if(this.pointerRegisterAllocationTable[i][1] == owner){
					//一致したので解放する
					this.pointerRegisterAllocationTable.splice(i, 1);
				}
				break;
			}
		}
		if(i == iLen){
			console.log("register free error.");
		}
	},
	freeAllRegisterOfOwner: function(owner){
		//ownerが確保しているレジスタをすべて解放する
		//IntegerRegister
		for(var i = 0, iLen = this.integerRegisterAllocationTable.length; i < iLen; i++){
			if(this.integerRegisterAllocationTable[i][1] == owner){
				//見つけた
				this.integerRegisterAllocationTable.splice(i, 1);
				iLen--;
			}
		}
		//PointerRegister
		for(var i = 0, iLen = this.pointerRegisterAllocationTable.length; i < iLen; i++){
			if(this.pointerRegisterAllocationTable[i][1] == owner){
				//見つけた
				this.pointerRegisterAllocationTable.splice(i, 1);
				iLen--;
			}
		}
	},
	expandBinaryString: function(){
		var ary = this.bin;
		var b = new Array();
		var aryStack = new Array();
		var indexStack = new Array();
		for(var i = 0; ; i++){
			if(ary[i] === undefined){
				ary = aryStack.pop();
				if(ary === undefined){
					break;
				}
				i = indexStack.pop();
			}
			if(ary[i] instanceof Array){
					aryStack.push(ary);
					indexStack.push(i + 1);
					ary = ary[i];
					i = -1;
			} else if(ary[i] !== undefined){
					b.push(ary[i]);
			}
		}
		this.bin = b;
	},
	assignRegister: function(){
		for(var i = 0, iLen = this.bin.length; i < iLen; i++){
			if(this.bin[i] > 0xff){
				if(this.virtualIntegerRegisterOffset <= this.bin[i] && this.bin[i] <= this.virtualIntegerRegisterOffset + 0x1f){
					//R00-R1fは無条件で割り当ててOK
					this.bin[i] -= this.virtualIntegerRegisterOffset;
				} else if(this.virtualPointerRegisterOffset <= this.bin[i] && this.bin[i] <= this.virtualPointerRegisterOffset + 0x1f - 1){
					//P01-P1fは無条件で割り当ててOK
					this.bin[i] -= this.virtualPointerRegisterOffset;
					this.bin[i] += 1;
				} else{
					console.log("Sorry, but no more register.");
				}
			}
		}
	},
	saveBinary: function(){
		var m = this.env.IOManager;
		var cl = this.bin;
		var v = new Uint8Array(this.bin);
		var d = new Blob([v]);
		if(d){
			m.showDownloadLink(d);
		}
	},
	
}

//
// 文法構造クラス
//

function ELCHNOSCompiler_ExpressionStructure(compiler, lineCount){
	//共通部分
	this.compiler = compiler;
	this.lineCount = lineCount;
	this.bin = new Array();
}
ELCHNOSCompiler_ExpressionStructure.prototype = {
	T_VPtr		:0x01,
	T_SINT8		:0x02,	//8bitの符号付き, いわゆる signed char.
	T_UINT8		:0x03,
	T_SINT16	:0x04,	//16bitの符号付き, いわゆる short.
	T_UINT16	:0x05,
	T_SINT32	:0x06,
	T_UINT32	:0x07,
	T_SINT4		:0x08,
	T_UINT4		:0x09,
	T_SINT2		:0x0a,
	T_UINT2		:0x0b,
	T_SINT1		:0x0c,	//代入できるのは0か-1のみ.
	T_UINT1		:0x0d,
	T_SINT12	:0x0e,
	T_UINT12	:0x0f,
	T_SINT20	:0x10,
	T_UINT20	:0x11,
	T_SINT24	:0x12,
	T_UINT24	:0x13,
	T_SINT28	:0x14,
	T_UINT28	:0x15,
	createBinary: function(){
		this.compiler.unexpected = true;
		return undefined;
	},
	appendInstruction_LB: function(opt, labelID){
		this.bin.push(0x01, opt);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_UINT32BE: function(data){
		this.bin.push((data >> 24) & 0xFF);
		this.bin.push((data >> 16) & 0xFF);
		this.bin.push((data >> 8) & 0xFF);
		this.bin.push(data & 0xFF);
	},
	appendInstruction_JMP: function(labelID){
		//03	reg0	imm32					PLIMM(reg0, imm32);
		this.bin.push(0x03, 0x3f);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_ConditionalJMP: function(cndReg, labelID){
		//04	reg0R									CND(reg0R);
		this.bin.push(0x04, cndReg);
		//03	reg0	imm32					PLIMM(reg0, imm32);
		this.bin.push(0x03, 0x3f);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_LIMM3F: function(data){
		this.bin.push(0x02, 0x3f);
		this.appendInstruction_UINT32BE(data);
	},
}

var ELCHNOSCompiler_ExpressionStructure_Variable = function(compiler, lineCount){
	// if(!isPointer && labelID != 0):DATA命令によるデータ(ラベル番号の代わり)
	// if(isPointer && labelID == 0):ポインタ変数
	// if(!isPointer && labelID == 0):一般変数
	// if(isImmediateData):即値(initValue[0]がその値)
	ELCHNOSCompiler_ExpressionStructure_Variable.base.apply(this, arguments);
	this.bits = 0;
	//配列でなければ0が入る
	this.length = 0;
	this.isSigned = false;
	this.isPointer = false;
	this.isImmediateData = false;
	//ポインタタイプはcreateBinary実行時に決定される
	this.pointerType = undefined;
	this.identifier = null;
	this.initValue = new Array();
	//引数として渡されるものであれば、引数の左から数えて何番目かが入る。
	this.argumentIndex = -1;
	//dataをポインタとして持つ場合はlabelIDが利用される。
	//それ以外の場合はレジスタIDを利用する。
	this.labelID = 0;
	this.registerID = 0xff;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		//配列であればデータ命令のバイナリを作成して返す。
		if(this.length > 0){
			this.assignPointerType();
			//LB(opt:0x1, 0x0);
			this.labelID = this.compiler.allocateLabelID();
			this.appendInstruction_LB(0x01, this.labelID);
			//34	typ32	len32	data...	
			this.bin.push(0x34);
			//typ32
			if(this.pointerType == this.T_UINT8){
				this.bin.push(0x00, 0x00, 0x00, 0x03);
			}
			//len32
			this.appendInstruction_UINT32BE(this.length);
			//data
			if(this.pointerType == this.T_UINT8){
				for(var i = 0, iLen = this.initValue.length; i < iLen; i++){
					this.bin.push(this.initValue[i] & 0xFF);
				}
				if(i > this.length){
					this.compiler.unexpected = true;
					return undefined;
				} else{
					for(iLen = this.length; i < iLen; i++){
						this.bin.push(0x00);
					}
				}
			}
			return this.bin;
		} else{
			//レジスタ変数であれば、スコープに入ったときにレジスタ番号が割り振られるので、今は何もしない
			return undefined;
		}
	},
	allocateRegisterID: function(owner){
		//関数スコープに入ったとき呼ばれる
		this.assignPointerType();
		if(this.isPointer){
			this.registerID = this.compiler.allocatePointerRegister(owner);
		} else{
			this.registerID = this.compiler.allocateIntegerRegister(owner);
		}
	},
	assignPointerType: function(){
		//ポインタタイプ決定
		if(this.length > 0 || this.isPointer){
			if(this.bits == 8 && this.isSigned == false){
				//T_UINT8		:0x03,
				this.pointerType = this.T_UINT8;
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
				return undefined;
			}
		}
	},
	copyFrom: function(src){
		//自分のidentifierと型は保持したまま、その指す内容をsrcと等価にする。
		//srcにはこのクラスのインスタンス・レジスタ文字列・即値が指定できる
		if(src instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
			//このクラス
			if(!src.isPointer && src.labelID == 0){
				// if(!isPointer && labelID == 0):一般変数
				this.bits = src.bits;
				this.isSigned = src.isSigned;
				this.isPointer = false;
				this.isImmediateData = false;
				this.labelID = 0;
				this.registerID = src.registerID;
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		} else if(!isNaN(src)){
			//即値
			src = parseInt(src);
			this.bits = 0;
			//配列でなければ0が入る
			this.isPointer = false;
			this.isImmediateData = true;
			//ポインタタイプはcreateBinary実行時に決定される
			this.initValue = [src];
			this.labelID = 0;
			this.registerID = 0xff;
		} else if(typeof src == "string"){
			src = src.toLowerCase();
			if(src.indexOf("r") == 0){
				//整数レジスタ名
				console.log("unexpected.");
				this.compiler.unexpected = true;
			} else if(src.indexOf("p") == 0){
				//ポインタレジスタ名
				console.log("unexpected.");
				this.compiler.unexpected = true;
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		} else{
			console.log("unexpected.");
			this.compiler.unexpected = true;
		}
	},
});

var ELCHNOSCompiler_ExpressionStructure_Function = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Function.base.apply(this, arguments);
	this.structure = new Array();
	this.identifier = null;
	this.isInline = false;
	this.labelID = 0;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		if(this.isInline){
			//インライン関数はその場で展開されるのでバイナリはここでは生成しない
			return undefined;
		} else{
			//レジスタ退避のことはまだ考えてない(実質inline)
			//optを変更できるようにするべき(grobal指定)
			//LB(opt:0x0, this.labelID);
			
			this.labelID = this.compiler.allocateLabelID();
			this.appendInstruction_LB(0x00, this.labelID);
			//内部
			for(var i = 0, iLen = this.structure.length; i < iLen; i++){
				if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
					this.structure[i].allocateRegisterID(this);
				} else{
					var b = this.structure[i].createBinary();
					if(b !== undefined){
						this.bin.push(b);
					}
				}
				if(this.compiler.unexpected){
					if(!this.compiler.errLine){
						this.compiler.errLine = this.structure[i].lineCount;
					}
					console.log(this);
					return undefined;
				}
			}
			this.compiler.freeAllRegisterOfOwner(this);
			return this.bin;
		}
	},
	createBinary_Inline: function(argStack){
		//argStackは引数が右から詰まったリスト(popしていくと順番通り)
		var argCount = 0;
		if(this.isInline){
			//内部
			for(var i = 0, iLen = this.structure.length; i < iLen; i++){
				if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
					if(this.structure[i].argumentIndex != -1){
						//インライン引数展開
						var o = argStack.pop();
						if(o !== undefined && argCount == this.structure[i].argumentIndex){
							argCount++;
							this.structure[i].copyFrom(o);
						} else{
							console.log("unexpected.");
							this.compiler.unexpected = true;
						}
					} else{
						//通常変数初期化
						this.structure[i].allocateRegisterID(this);
					}
				} else{
					var b = this.structure[i].createBinary();
					if(b !== undefined){
						this.bin.push(b);
					}
				}
				if(this.compiler.unexpected){
					if(!this.compiler.errLine){
						this.compiler.errLine = this.structure[i].lineCount;
					}
					console.log(this);
					return undefined;
				}
			}
			this.compiler.freeAllRegisterOfOwner(this);
			return this.bin;
		} else{
			return undefined;
		}
	},
});

var ELCHNOSCompiler_ExpressionStructure_Loop_for = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Loop_for.base.apply(this, arguments);
	this.structure = new Array();
	this.initializer = null;
	this.conditonalExpression = null;
	this.incrementalExpression = null;
	this.loopLabelID = 0;
	this.endLabelID = 0;
	this.passLabelID = 0;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		//initializer
		//loopLabelID:
		//conditonalExpression
		//-?>passLabelID
		//->endLabelID
		//passLabelID:
		//実行部分
		//(break->endLabelID)
		//incrementalExpression
		//->loopLabelID
		//endLabelID:
		
		this.loopLabelID = this.compiler.allocateLabelID();
		this.endLabelID = this.compiler.allocateLabelID();
		//少し手抜き
		this.passLabelID = this.compiler.allocateLabelID();
		
		//initializer
		this.bin.push(this.initializer.createBinary());
		if(this.compiler.unexpected){
			return this.bin;
		}
		//loopLabelID:
		this.appendInstruction_LB(0x00, this.loopLabelID);
		//conditonalExpression
		//本当はR3fを使いたいけど少し手抜き
		this.bin.push(this.conditonalExpression.createBinary());
		if(this.compiler.unexpected){
			return this.bin;
		}
		//-?>passLabelID
		this.appendInstruction_ConditionalJMP(this.conditonalExpression.getRegisterIDAsIntegerRegister(this.conditonalExpression.dataStack[0]), this.passLabelID);
		//->endLabelID
		this.appendInstruction_JMP(this.endLabelID);
		//passLabelID:
		this.appendInstruction_LB(0x00, this.passLabelID);
		//実行部分
		for(var i = 0, iLen = this.structure.length; i < iLen; i++){
			if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
				//ブロックスコープでの変数宣言は未実装
				//this.structure[i].allocateRegisterID(this);
				this.compiler.unexpected = true;
			} else{
				var b = this.structure[i].createBinary();
				if(b !== undefined){
					this.bin.push(b);
				}
			}
			if(this.compiler.unexpected){
				if(!this.compiler.errLine){
					this.compiler.errLine = this.structure[i].lineCount;
				}
				console.log(this);
				return undefined;
			}
		}
		
		//incrementalExpression
		this.bin.push(this.incrementalExpression.createBinary());
		if(this.compiler.unexpected){
			return this.bin;
		}
		//->loopLabelID
		this.appendInstruction_JMP(this.loopLabelID);
		//endLabelID:
		this.appendInstruction_LB(0x00, this.endLabelID);
		
		return this.bin;
	},
});

var ELCHNOSCompiler_ExpressionStructure_if = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_if.base.apply(this, arguments);
	this.structure = new Array();
	this.conditonalExpression = null;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		//conditonalExpression
		//-?>passLabelID
		//->endLabelID
		//passLabelID:
		//実行部分
		//(break->endLabelID)
		//endLabelID:
		
		this.endLabelID = this.compiler.allocateLabelID();
		//少し手抜き
		this.passLabelID = this.compiler.allocateLabelID();
		
		//conditonalExpression
		//本当はR3fを使いたいけど少し手抜き
		this.bin.push(this.conditonalExpression.createBinary());
		if(this.compiler.unexpected){
			return this.bin;
		}
		//-?>passLabelID
		this.appendInstruction_ConditionalJMP(this.conditonalExpression.getRegisterIDAsIntegerRegister(this.conditonalExpression.dataStack[0]), this.passLabelID);
		//->endLabelID
		this.appendInstruction_JMP(this.endLabelID);
		//passLabelID:
		this.appendInstruction_LB(0x00, this.passLabelID);
		//実行部分
		for(var i = 0, iLen = this.structure.length; i < iLen; i++){
			if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
				//ブロックスコープでの変数宣言は未実装
				//this.structure[i].allocateRegisterID(this);
				this.compiler.unexpected = true;
			} else{
				var b = this.structure[i].createBinary();
				if(b !== undefined){
					this.bin.push(b);
				}
			}
			if(this.compiler.unexpected){
				if(!this.compiler.errLine){
					this.compiler.errLine = this.structure[i].lineCount;
				}
				console.log(this);
				return undefined;
			}
		}

		//endLabelID:
		this.appendInstruction_LB(0x00, this.endLabelID);
		
		return this.bin;
	},
});

var ELCHNOSCompiler_ExpressionStructure_Expression = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Expression.base.apply(this, arguments);
	this.evalStack = new Array();
	this.evalOperatorStack = new Array();
	this.lastOperatorPriority = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.operatorPriorityList.length;
	this.startBracketIndexStack = new Array();
	this.mode = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.Mode_Operand;
	this.shouldPushOperatorAfterNextOperand = false;
	//
	this.tmpRegs = new Array();
	this.dataStack = new Array();
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	//drawLine(1 + 4, x0, y0, x1, y1, col);
	//->	drawLine 1 4 + x0 y0 x1 y1 col ()
	//f(g(1 + 4 * (2 - 3)), 4 * 2 + 1);
	//->	f g 1 4 2 3 - * + () 4 2 * 1 + ()
	Mode_Operand: 0,
	Mode_Operator: 1,
	operatorPriorityList: [
		"++",
		"--",
		"/",
		"*",
		"-",
		"+",
		//"/=",
		//"+=",
		//"-=",
		//"+=",
	],
	pushOperand: function(identifier){
		//オペランドを追加する
		//数値ならば数値自体もしくは等価な文字列
		//オブジェクトであればそのオブジェクトのインスタンスを渡す
		//モード確認
		if(this.mode != this.Mode_Operand){
			console.log("unexpected.");
			this.compiler.unexpected = true;
			return;
		}
		this.mode = this.Mode_Operator;
		
		this.evalStack.push(identifier);
		
		if(this.shouldPushOperatorAfterNextOperand){
			this.shouldPushOperatorAfterNextOperand = false;
			var o = this.evalOperatorStack.pop();
			if(o == "-" && this.getImmediateData(identifier) !== undefined){
				//定数のマイナスだったので計算して値として積み直す
				o = -this.getImmediateData(this.evalStack.pop());
			}
			this.evalStack.push(o);
		}
	},
	pushOperator: function(operator){
		//演算子を追加する。
		//演算子は文字列で渡す
		//モード確認
		if(this.mode != this.Mode_Operator){
			if(operator == "*" || operator == "-"){
				this.shouldPushOperatorAfterNextOperand = true;
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
				return;
			}
		}
		this.mode = this.Mode_Operand;

		if(operator == "("){
			//開き括弧のevalOperatorStack内でのIndexを記憶
			if(this.evalStack[this.evalStack.length - 1] instanceof ELCHNOSCompiler_ExpressionStructure_Function){
				//関数呼び出しの括弧
				//-(index + 1)で記憶しておく
				this.startBracketIndexStack.push(-(this.evalOperatorStack.length + 1));
			} else{
				//式の優先順位を示す括弧
				this.startBracketIndexStack.push(this.evalOperatorStack.length);
			}
			this.evalOperatorStack.push(operator);
		} else if(operator == ")"){
			//開き括弧のインデックスを得る
			//開き括弧までのOperatorを順にevalStackにpushして、括弧内の式を完結させる
			var i = this.startBracketIndexStack.pop();
			for(;;){
				var o = this.evalOperatorStack.pop();
				if(o == "("){
					break;
				} else if(o === undefined){
					//括弧の個数が合わないのでエラー
					this.compiler.unexpected = true;
					return;
				}
				this.evalStack.push(o);
			}
			if(i < 0){
				//関数呼び出しの括弧
				this.evalStack.push("()");
			}
		} else if(operator == ","){
			//現在の階層の式を完結させる
			for(;;){
				var o = this.evalOperatorStack.pop();
				if(o == "("){
					//開き括弧は戻しておく
					this.evalOperatorStack.push(o);
					break;
				} else if(o === undefined){
					//すべてプッシュしたので終了
					break;
				}
				this.evalStack.push(o);
			}
		} else{
			//一般operator
			var p = this.getOperatorPriority(operator);
			if(this.lastOperatorPriority >= p){
				//とりあえずとっておく
				this.evalOperatorStack.push(operator);
			} else{
				//優先順位がより高い演算子を先に積んでおき、そのあと自分をとっておく
				for(var i = 0, iLen = this.evalOperatorStack.length; i < iLen; i++){
					var o = this.evalOperatorStack.pop();
					if(this.getOperatorPriority(o) < p){
						this.evalStack.push(o);
					} else{
						this.evalOperatorStack.push(o);
						break;
					}
				}
				this.evalOperatorStack.push(operator);
			}
			this.lastOperatorPriority = p;
		}
	},
	pushIdentifier: function(identifier){
		//識別子を式に追加する。
		//自動的にオペランドか演算子かを判別し、適切にプッシュする。
		//識別子は大文字小文字を区別できる状態で渡すようにする
		//レジスタ直接指定もできる。Rxx, Pxx, 大文字小文字の区別なし。xxは16進。
		
		if(this.isOperator(identifier)){
			//演算子
			this.pushOperator(identifier);
		} else {
			var o = this.compiler.searchIdentifier(identifier);
			if(o){
				//オブジェクトオペランド
				this.pushOperand(o);
			} else if(!isNaN(identifier)){
				//即値オペランド
				this.pushOperand(parseInt(identifier));
			} else{
				//レジスタ名である可能性を確認
				var s = identifier.toLowerCase();
				if(this.isRegisterName(s)){
					//レジスタ名指定
					this.pushOperand(s);
				} else{
					this.compiler.unexpected = true;
				}
			}
		}
	},
	readExpressionToTerminator: function(startIndex, terminalCharacter){
		//startIndexの次の文字から、terminalCharacterまでの識別子を式に追加する。
		//括弧の対応関係はきちんと数えているので、terminalCharacterに閉じ括弧を指定しても問題ない。
		//戻り値は、最後に追加した識別子の次の文字のseparatedにおけるインデックスで、
		//正常に読み込まれた場合はterminalCharacterを指す。
		var i = startIndex;
		for(i++; ; i++){
			var s = this.compiler.separated[i];
			if(s == undefined){
				this.compiler.unexpected = true;
				break;
			}
			if(this.startBracketIndexStack.length == 0 && s == terminalCharacter){
				break;
			}
			this.pushIdentifier(s);
			if(this.compiler.unexpected){
				break;
			}
		}
		return i;
	},
	getOperatorPriority: function(operator){
		for(var i = 0, iLen = this.operatorPriorityList.length; i < iLen; i++){
			if(this.operatorPriorityList[i] == operator){
				break;
			}
		}
		return i;
	},
	isOperator: function(s){
		return (
			s == "=" ||
			s == "+" ||
			s == "-" ||
			s == "*" ||
			s == "/" ||
			s == "!=" ||
			s == "++" ||
			s == "<" ||
			s == "(" ||
			s == ")"||
			s == "," ||
			s == "()" ||
			s == "<=" ||
			false
		);
	},
	isRegisterName: function(s){
		s = s.toLowerCase();
		return (s.indexOf("r") == 0 || s.indexOf("p") == 0) && !isNaN(s.substring(1));
	},
	createBinary: function(destRegID){
		//式を計算します。代入式の場合は代入を行います。
		//destRegIDは、条件式などの結果を一時的に保存するために整数レジスタ番号(数値)を指定することができます。
		//指定された場合は最後の計算結果をdestRegIDに格納する処理を行います。
		//計算結果とは、代入式の場合は計算後の右辺、評価式の場合はその評価値となります。
		//まずスタックを処理しやすいように詰め直す
		var stack = new Array();
		var fArgStack = new Array();
		var f = null;
		var op00;
		var op01;
		var op02;
		var opcode = 0xff;
		//残っている演算子から
		for(var i = 0, iLen = this.evalOperatorStack.length; i < iLen; i++){
			this.evalStack.push(this.evalOperatorStack.pop());
		}
		for(var i = 0, iLen = this.evalStack.length; i < iLen; i++){
			stack.push(this.evalStack.pop());
		}
		console.log(stack.join(","));
		for(var i = 0, iLen = stack.length; i < iLen; i++){
			var o = stack.pop();
			if(this.isOperator(o)){
				if(o == "="){
					//2:代入
					op01 = this.dataStack.pop();
					op00 = this.dataStack.pop();
					if(op00 === undefined || op01 === undefined){
						console.log("unexpected.");
						this.compiler.unexpected = true;
						break;
					}
					this.createBinary_substitute(op00, op01);
				} else if(	o == "!=" || o == "-" || o == "<=" || o == "+"){
					//2:比較,二項整数演算子
					//21	reg0	reg1	reg2							CMPNE(reg0, reg1, reg2);
					op02 = this.dataStack.pop();
					op01 = this.dataStack.pop();
					if(op01 === undefined || op02 === undefined){
						console.log("unexpected.");
						this.compiler.unexpected = true;
						break;
					}
					if(o == "!="){
						opcode = 0x21;
					} else if(o == "-"){
						opcode = 0x15;
					} else if(o == "<="){
						opcode = 0x24;
					} else if(o == "+"){
						opcode = 0x14;
					} else{
						console.log("unexpected.");
						this.compiler.unexpected = true;
						break;
					}
					if(opcode != 0xff){
						this.createBinary_TernaryIntegerOperation(op01, op02, opcode);
					}
				} else if(o == "*"){
					//乗算またはポインタアクセス
					op02 = this.dataStack.pop();
					if(this.getRegisterIDAsPointerRegister(op02) !== undefined){
						//ポインタアクセス
						this.createBinary_readPointer(op02);
					} else{
						//乗算
						console.log("unexpected.");
						this.compiler.unexpected = true;
					}
				} else if(o == "++"){
					//increment
					op00 = this.dataStack.pop();
					if(op00 === undefined){
						console.log("unexpected.");
						this.compiler.unexpected = true;
						break;
					}
					this.createBinary_increment(op00);
				} else if(o == "()"){
					//関数呼び出し
					for(;;){
						op00 = this.dataStack.pop();
						if(op00 instanceof ELCHNOSCompiler_ExpressionStructure_Function){
							f = op00;
							break;
						} else if(op00 === undefined){
							console.log("unexpected.");
							this.compiler.unexpected = true;
							break;
						} else{
							fArgStack.push(op00);
						}
					}
					if(f.isInline){
						//インライン関数の直接展開
						this.bin.push(f.createBinary_Inline(fArgStack));
						//これはダミー
						this.dataStack.push("r30");
					} else{
						console.log("unexpected.");
						this.compiler.unexpected = true;
					}
				} else{
					console.log("unexpected.");
					this.compiler.unexpected = true;
					break;
				}
			} else{
				this.dataStack.push(o);
			}
		}
		if(this.dataStack.length == 1){
			//最終的には1になるはず
			if(destRegID !== undefined){
				//最終代入先が決まっている
				var lastData = this.dataStack.pop();
				//レジスタ利用効率化はあとまわし
				//if(this.tmpRegs.isIncluded(lastReg)){
				//}
				this.createBinary_substitute("r" + destRegID.toString(16), lastData);
			}
		} else{
			console.log("unexpected.");
			this.compiler.unexpected = true;
		}
		this.compiler.freeAllRegisterOfOwner(this);
		return this.bin;
	},
	createBinary_substitute: function(dest, src){
		var destValue;
		var srcValue;
		
		destValue = this.getRegisterIDAsPointerRegister(dest);
		if(destValue !== undefined){
			//destはポインタレジスタ
			srcValue = this.getLabelID(src);
			if(srcValue !== undefined){
				//srcはラベル
				//ラベル番号からの代入
				//PLIMM
				//03	reg0	imm32
				this.bin.push(0x03, destValue);
				this.appendInstruction_UINT32BE(srcValue);
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		} else{
			destValue = this.getRegisterIDAsIntegerRegister(dest);
			if(destValue !== undefined){
				//destは整数レジスタ
				srcValue = this.getImmediateData(src);
				if(srcValue !== undefined){
					//srcは即値
					//即値代入
					//02	reg0	imm32					LIMM(reg0, imm32);
					this.bin.push(0x02, destValue);
					this.appendInstruction_UINT32BE(srcValue);
				} else{
					srcValue = this.getRegisterIDAsIntegerRegister(src);
					if(srcValue !== undefined){
						//srcは整数レジスタ
						//10	reg0	reg1	FF							CP(reg0, reg1);
						this.bin.push(0x10, destValue, srcValue, 0xff);
					} else{
						console.log("unexpected.");
						this.compiler.unexpected = true;
					}
				}
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		}
		this.dataStack.push(dest);
	},
	createBinary_TernaryIntegerOperation: function(src0, src1, opcode){
		//destは自動的に割り当てる
		var destValue;
		var src0Value;
		var src1Value;
		
		//まず引数がそれぞれ即値か確認する
		src0Value = this.getImmediateData(src0);
		src1Value = this.getImmediateData(src1);
		if(src0Value !== undefined && src1Value !== undefined){
			//両方とも即値だったので計算しておしまい
			switch(opcode){
				case 0x14:
					destValue = src0Value + src1Value;
					break;
				default:
					console.log("unexpected.");
					this.compiler.unexpected = true;
					return;
			}
			this.dataStack.push(destValue);
			return;
		}
		//即値だったものをR3F展開（どちらかのみ実行される）
		//もしくはレジスタ番号を取得
		if(src0Value !== undefined){
			this.appendInstruction_LIMM3F(src0Value);
			src0Value = 0x3f;
		} else{
			src0Value = this.getRegisterIDAsIntegerRegister(src0);
			if(src0Value === undefined){
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		}
		if(src1Value !== undefined){
			this.appendInstruction_LIMM3F(src1Value);
			src1Value = 0x3f;
		} else{
			src1Value = this.getRegisterIDAsIntegerRegister(src1);
			if(src1Value === undefined){
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		}
		//格納先のレジスタをひとつもらう
		destValue = this.compiler.allocateIntegerRegister(this);
		this.tmpRegs.push(destValue);
		//この関数内ではdestは整数レジスタ番号だが、dataStackに積む時は文字列として、頭にrをつけるのを忘れないこと。
		//命令発行
		//reg0	reg1	reg2							CMPcc(reg0, reg1, reg2);
		this.bin.push(opcode, destValue, src0Value, src1Value);
		
		this.dataStack.push("r" + destValue.toString(16));
	},
	createBinary_readPointer: function(src0){
		//destは自動的に割り当てる
		var destValue;
		var src0Value;
		
		destValue = this.compiler.allocateIntegerRegister(this);
		this.tmpRegs.push(destValue);
		//この関数内ではdestValueは整数レジスタ番号だが、dataStackに積む時は文字列として、頭にrをつけるのを忘れないこと。

		src0Value = this.getRegisterIDAsPointerRegister(src0);
		if(src0Value !== undefined){
			//src0はポインタレジスタ
			//08	reg0R	typ32	reg1P	00			LMEM(reg0R, typ32, reg1P, 0);
			this.bin.push(0x08, destValue);
			this.appendInstruction_UINT32BE(src0.pointerType);
			this.bin.push(src0Value, 0x00);
		} else{
			console.log("unexpected.");
			this.compiler.unexpected = true;
		}
		this.dataStack.push("r" + destValue.toString(16));
	},
	createBinary_increment: function(dest){
		var destValue;
		
		destValue = this.getRegisterIDAsPointerRegister(dest);
		if(destValue !== undefined){
			//destはポインタレジスタ
			//即値加算
			this.appendInstruction_LIMM3F(0x01);
			//0E	reg0P	typ32	reg1P	reg2R			PADD(reg0P, typ32, reg1P, reg2R);
			this.bin.push(0x0e, destValue);
			this.appendInstruction_UINT32BE(dest.pointerType);
			this.bin.push(destValue);
			this.bin.push(0x3f);
		} else{
			destValue = this.getRegisterIDAsIntegerRegister(dest);
			if(destValue !== undefined){
				//即値加算
				this.appendInstruction_LIMM3F(0x01);
				//14	reg0	reg1	reg2							ADD(reg0, reg1, reg2);	reg0 = (reg1 + reg2);
				this.bin.push(0x14, destValue, destValue, 0x3f);
			} else{
				console.log("unexpected.");
				this.compiler.unexpected = true;
			}
		}
		this.dataStack.push(dest);
	},
	getRegisterIDAsIntegerRegister: function(o){
		//戻り値は整数レジスタ番号（数値）
		//整数レジスタでない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && !o.isPointer && o.labelID == 0){
			return o.registerID;
		}
		if((typeof o == "string") && o.toLowerCase().indexOf("r") == 0){
			return parseInt(o.substring(1), 16);
		}
		return undefined;
	},
	getLabelID: function(o){
		//戻り値はラベル番号（数値）
		//ラベル番号でない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && !o.isPointer && o.labelID != 0){
			return o.labelID;
		}
		return undefined;
	},
	getRegisterIDAsPointerRegister: function(o){
		//戻り値はポインタレジスタ番号（数値）
		//ポインタレジスタでない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && o.isPointer && o.labelID == 0){
			return o.registerID;
		}
		if((typeof o == "string") && o.toLowerCase().indexOf("p") == 0){
			return parseInt(o.substring(1), 16);
		}
		return undefined;
	},
	getImmediateData: function(o){
		//戻り値は即値（数値）
		//即値でない場合はundefinedを返す。
		if(!isNaN(o)){
			return parseInt(o);
		}
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && o.isImmediateData){
			return o.initValue[0];
		}
		return undefined;
	},
});

var ELCHNOSCompiler_ExpressionStructure_OSECPUBinary = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_OSECPUBinary.base.apply(this, arguments);
	this.isCompiled = false;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		if(!this.isCompiled){
			this.compiler.unexpected = true;
		}
		return this.bin;
	},
});