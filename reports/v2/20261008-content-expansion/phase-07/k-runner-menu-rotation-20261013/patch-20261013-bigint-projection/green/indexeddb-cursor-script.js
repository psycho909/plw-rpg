async()=>{
      const MAX_RECORD_PROJECTION_NODES=256;
    const MAX_RECORD_PROJECTION_DEPTH=8;
    const MAX_RECORD_PROJECTION_TEXT=1024;
    const MAX_RECORD_PROJECTION_TEXT_BUDGET=4096;
    const MAX_RECORD_PROJECTION_PROPERTIES=64;
    const projectIndexedDBRecord=(key,value)=>{
      let nodes=0,textCharacters=0,truncated=false;const seen=new WeakSet();
      const text=value=>{const string=String(value);const allowance=Math.max(0,Math.min(MAX_RECORD_PROJECTION_TEXT,MAX_RECORD_PROJECTION_TEXT_BUDGET-textCharacters));const clipped=string.slice(0,allowance);textCharacters+=clipped.length;if(clipped.length<string.length){truncated=true;return clipped+'[Truncated]';}return clipped;};
      const visit=(input,depth)=>{
        nodes++;if(nodes>MAX_RECORD_PROJECTION_NODES){truncated=true;return '[NodeLimit]';}
        if(input===null||typeof input==='boolean')return input;
        if(typeof input==='string')return text(input);
        if(typeof input==='number')return Number.isFinite(input)?input:String(input);
        if(typeof input==='bigint'){truncated=true;return '[BigInt omitted]';}
        if(typeof input==='undefined')return '[Undefined]';
        if(typeof input!=='object')return text(typeof input);
        if(depth>=MAX_RECORD_PROJECTION_DEPTH){truncated=true;return '[DepthLimit]';}
        if(seen.has(input)){truncated=true;return '[RepeatedReference]';}
        if(input instanceof Date)return Number.isNaN(input.getTime())?'[InvalidDate]':input.toISOString();
        if(input instanceof ArrayBuffer)return {type:'ArrayBuffer',byteLength:input.byteLength};
        if(ArrayBuffer.isView(input))return {type:input.constructor.name,byteLength:input.byteLength};
        if(typeof Blob!=='undefined'&&input instanceof Blob)return {type:'Blob',size:input.size,mimeType:text(input.type)};
        seen.add(input);
        let output;
        if(Array.isArray(input)){
          output=[];const limit=Math.min(input.length,MAX_RECORD_PROJECTION_PROPERTIES);
          for(let index=0;index<limit;index++)output.push(visit(input[index],depth+1));
          if(input.length>limit){truncated=true;output.push('[PropertyLimit]');}
        }else{
          output={};let included=0;
          for(const property in input){
            if(!Object.prototype.hasOwnProperty.call(input,property))continue;
            if(included>=MAX_RECORD_PROJECTION_PROPERTIES){truncated=true;output.__truncated__='[PropertyLimit]';break;}
            output[text(property)]=visit(input[property],depth+1);included++;
          }
        }
        seen.delete(input);return output;
      };
      return {value:visit({key,value},0),truncated,nodes:Math.min(nodes,MAX_RECORD_PROJECTION_NODES),textCharacters};
    };
      if(!indexedDB.databases)return {supported:false};
      const allInfos=await indexedDB.databases(); const infos=allInfos.slice(0,8); const out=[];
      for(const info of infos){if(!info.name)continue;out.push(await new Promise(resolve=>{
        const req=indexedDB.open(info.name);req.onupgradeneeded=()=>req.transaction.abort();req.onerror=()=>resolve({name:info.name,error:String(req.error),stores:{}});
        req.onsuccess=()=>{const db=req.result;const allStoreNames=[...db.objectStoreNames];const storeNames=allStoreNames.slice(0,32);
          Promise.all(storeNames.map(storeName=>new Promise(done=>{
            const tx=db.transaction(storeName,'readonly');const store=tx.objectStore(storeName);
            const row={count:null,sampledRecords:0,sampleLimit:64,serializedSampleBytes:0,serializedSampleCount:0,serializationErrors:0,truncatedSampleRecords:0};
            let countDone=false,cursorDone=false;
            const finish=()=>{if(countDone&&cursorDone)done([storeName,row]);};
            const countRequest=store.count();countRequest.onsuccess=()=>{row.count=countRequest.result;countDone=true;finish();};
            countRequest.onerror=()=>{row.count=null;countDone=true;finish();};
            const cursorRequest=store.openCursor();cursorRequest.onsuccess=()=>{
              const cursor=cursorRequest.result;
              if(!cursor||row.sampledRecords>=row.sampleLimit){cursorDone=true;finish();return;}
              row.sampledRecords++;
              try{const projection=projectIndexedDBRecord(cursor.key,cursor.value);if(projection.truncated)row.truncatedSampleRecords++;const serialized=JSON.stringify(projection.value);if(typeof serialized==='string'){row.serializedSampleBytes+=new TextEncoder().encode(serialized).length;row.serializedSampleCount++;}else row.serializationErrors++;}
              catch{row.serializationErrors++;}
              if(row.sampledRecords<row.sampleLimit)cursor.continue();else{cursorDone=true;finish();}
            };
            cursorRequest.onerror=()=>{cursorDone=true;row.serializationErrors++;finish();};
          }))).then(rows=>{const stores=Object.fromEntries(rows);const counts=Object.fromEntries(rows.map(([name,row])=>[name,row.count]));db.close();resolve({name:info.name,counts,stores,omittedStoreCount:allStoreNames.length-storeNames.length});})
            .catch(error=>{db.close();resolve({name:info.name,error:String(error),stores:{}});});
        };
      }));}return {supported:true,databases:out,omittedDatabaseCount:Math.max(0,allInfos.length-infos.length)};
    }