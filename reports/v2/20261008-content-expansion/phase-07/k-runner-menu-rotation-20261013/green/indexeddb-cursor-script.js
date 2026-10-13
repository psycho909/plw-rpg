async()=>{
      if(!indexedDB.databases)return {supported:false};
      const allInfos=await indexedDB.databases(); const infos=allInfos.slice(0,8); const out=[];
      for(const info of infos){if(!info.name)continue;out.push(await new Promise(resolve=>{
        const req=indexedDB.open(info.name);req.onupgradeneeded=()=>req.transaction.abort();req.onerror=()=>resolve({name:info.name,error:String(req.error),stores:{}});
        req.onsuccess=()=>{const db=req.result;const allStoreNames=[...db.objectStoreNames];const storeNames=allStoreNames.slice(0,32);
          Promise.all(storeNames.map(storeName=>new Promise(done=>{
            const tx=db.transaction(storeName,'readonly');const store=tx.objectStore(storeName);
            const row={count:null,sampledRecords:0,sampleLimit:64,serializedSampleBytes:0,serializedSampleCount:0,serializationErrors:0};
            let countDone=false,cursorDone=false;
            const finish=()=>{if(countDone&&cursorDone)done([storeName,row]);};
            const countRequest=store.count();countRequest.onsuccess=()=>{row.count=countRequest.result;countDone=true;finish();};
            countRequest.onerror=()=>{row.count=null;countDone=true;finish();};
            const cursorRequest=store.openCursor();cursorRequest.onsuccess=()=>{
              const cursor=cursorRequest.result;
              if(!cursor||row.sampledRecords>=row.sampleLimit){cursorDone=true;finish();return;}
              row.sampledRecords++;
              try{const serialized=JSON.stringify({key:cursor.key,value:cursor.value});if(typeof serialized==='string'){row.serializedSampleBytes+=new TextEncoder().encode(serialized).length;row.serializedSampleCount++;}else row.serializationErrors++;}
              catch{row.serializationErrors++;}
              if(row.sampledRecords<row.sampleLimit)cursor.continue();else{cursorDone=true;finish();}
            };
            cursorRequest.onerror=()=>{cursorDone=true;row.serializationErrors++;finish();};
          }))).then(rows=>{const stores=Object.fromEntries(rows);const counts=Object.fromEntries(rows.map(([name,row])=>[name,row.count]));db.close();resolve({name:info.name,counts,stores,omittedStoreCount:allStoreNames.length-storeNames.length});})
            .catch(error=>{db.close();resolve({name:info.name,error:String(error),stores:{}});});
        };
      }));}return {supported:true,databases:out,omittedDatabaseCount:Math.max(0,allInfos.length-infos.length)};
    }