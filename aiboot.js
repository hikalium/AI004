function AI_Bootstrap(env){
	var append = function(t){ env.memory.appendMemoryTag(t); t.isBootstrap = true;};
	var w = function(str, uuid){ return new AI_WordTag(str, uuid); };
	var p = function(pattern, uuid, func){ return new AI_PatternTag(pattern, uuid, func); };
	var m = function(uuid, description){ return new AI_MeaningTag(uuid, description); };
	var wid = function(str){ return env.memory.getUUIDFromWord(str); };
	var t;
	
	//
	//文字列タグ
	//
	append(w("。", "b48267fb-f867-491c-a562-e5e24de389c1"));
	append(w("は", "b486d60c-9272-473b-af69-da028aebc635"));
	append(w("単語", "8cdaa0d7-a48e-48a1-bc79-9ae5308ea096"));
	append(w("です", "a1f3dbae-baf3-4423-86d3-d06debe33ef2"));
	append(w("記憶", "2fbdbea7-c25d-d38e-8418-99f1be50eb91"));
	append(w("を", "516fcf20-589d-421c-08b8-d9666f2d8c01"));
	append(w("保存", "be1f565e-7940-1e44-1c5b-752a8b72861d"));
	append(w("する", "2de2bbc0-0892-09b2-488d-96d6dfc841c6"));
	
	//
	//意味タグ
	//
	append(m(env.UUID_Meaning_UndefinedString, "未定義文字列"));
	append(m(env.UUID_Meaning_UndefinedStrings, "未定義文字列を含む複数の文字列"));
	
	//
	//パターンタグ
	//
	
	//単語教示
	/*
	append(p([
			env.UUID_Meaning_UndefinedString,
			wid("は"),
			wid("単語"),
			wid("です"),
			wid("。"),
		], "72d5f5b2-7943-4ea0-8a91-b2c84ed856f6", 
		function(env, separated, UUIDList){
			if(UUIDList[0] == env.UUID_Meaning_UndefinedString){
				env.message("「" + separated[0] + "」は単語なんですね！\n");
				env.memory.appendMemoryTag(new AI_WordTag(separated[0]));
				env.message(env.memory.wordList.length + "個目の単語を登録しました！\n");
			} else{
				env.message("「" + separated[0] + "」が単語なのは知ってますよ…。\n");
			}
		}
	));
	*/
	append(p(
		function(separated, separated_UUID){
			if(separated.length < 5){
				return false;
			}
			var a = separated.slice(-4);
			
			return (a.join("") == "は単語です。");
		},
		"72d5f5b2-7943-4ea0-8a91-b2c84ed856f6", 
		function(env, separated, UUIDList){
			var a = separated.slice(0, -4).join("");
			if(env.memory.getUUIDFromWord(a) == env.UUID_Meaning_UndefinedString){
				env.message("「" + a + "」は単語なんですね！\n");
				env.memory.appendMemoryTag(new AI_WordTag(a));
				env.message(env.memory.wordList.length + "個目の単語を登録しました！\n");
			} else{
				env.message("「" + a + "」が単語なのは知ってますよ…。\n");
			}
		}
	));
	//記憶保存
	append(p([
			wid("記憶"),
			wid("を"),
			wid("保存"),
			wid("する"),
			wid("。"),
		], "0101d94e-c664-44fd-9d75-669eb94e9d29", 
		function(env, separated, UUIDList){
			env.memory.saveMemory();
			env.message("記憶を保存したファイルを作成しました。\nDownloadsのリンクを右クリックして、名前をつけて保存してください。\n");
		}
	));
	
	//
	//ジョブタグ
	//
	
	t = new AI_Job_Ask_isWord(env);
	t.addJobToStack();
}