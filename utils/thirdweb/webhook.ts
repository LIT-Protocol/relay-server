import crypto from "crypto";


const generateSignature = (
    body: string,
    timestamp: string,
    secret: string,
  ): string => {
    const payload = `${timestamp}.${body}`;
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  };
  
 export const isValidSignature = (
    body: string,
    timestamp: string,
    signature: string,
    secret: string,
  ): boolean => {
    const expectedSignature = generateSignature(
      body,
      timestamp,
      secret,
    );
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  };
  

  export const isExpired = (
    timestamp: string,
    expirationInSeconds: number,
  ): boolean => {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime - parseInt(timestamp) > expirationInSeconds;
  };
  