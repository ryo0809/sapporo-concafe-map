import {randomBytes,createPublicKey,publicEncrypt,privateDecrypt,createCipheriv,createDecipheriv,constants} from "node:crypto";
export function validateBackupKey(pem){
  const key=createPublicKey(pem);
  if(key.asymmetricKeyType!=="rsa"||key.asymmetricKeyDetails.modulusLength<2048)throw new Error("バックアップ用にRSA 2048bit以上の公開鍵を指定してください。");
  return key;
}
export function encryptBackup(buffer,pem){
  const key=randomBytes(32),iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  const data=Buffer.concat([cipher.update(buffer),cipher.final()]);
  return {format:1,algorithm:"RSA-OAEP-SHA256+AES-256-GCM",key:publicEncrypt({key:validateBackupKey(pem),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha256"},key).toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:data.toString("base64")};
}
export function decryptBackup(envelope,pem){
  if(envelope.format!==1||envelope.algorithm!=="RSA-OAEP-SHA256+AES-256-GCM")throw new Error("バックアップ形式が不正です。");
  const key=privateDecrypt({key:pem,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha256"},Buffer.from(envelope.key,"base64"));
  const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(envelope.iv,"base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data,"base64")),decipher.final()]);
}
