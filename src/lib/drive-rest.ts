import { getGoogleAccessToken } from './google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

export const driveRest = {
  async listFiles(q: string, fields = 'files(id, name, webViewLink)', pageSize = 1000, env: any = {}) {
    const token = await getGoogleAccessToken(env);
    const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Drive LIST failed: ${JSON.stringify(data)}`);
    return data.files || [];
  },

  async createFolder(name: string, parents: string[] = [], env: any = {}) {
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`${BASE_URL}/files?fields=id,webViewLink`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents
      })
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Drive CREATE failed: ${JSON.stringify(data)}`);
    return data;
  },

  async uploadFile(name: string, mimeType: string, parentId: string, base64Content: string, env: any = {}) {
    const token = await getGoogleAccessToken(env);
    const boundary = 'multipart_upload_boundary';
    
    const metadata = {
      name,
      parents: [parentId]
    };

    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let bodyBuffer: Uint8Array;
    if (typeof Buffer !== 'undefined') {
      bodyBuffer = Buffer.concat([
        Buffer.from(metadataPart, 'utf8'),
        Buffer.from(mediaPartHeader, 'utf8'),
        Buffer.from(base64Content, 'base64'),
        Buffer.from(closeDelimiter, 'utf8')
      ]);
    } else {
      const encoder = new TextEncoder();
      const metaArr = encoder.encode(metadataPart + mediaPartHeader);
      
      const rawBinary = atob(base64Content);
      const binaryArr = new Uint8Array(rawBinary.length);
      for (let i = 0; i < rawBinary.length; i++) {
        binaryArr[i] = rawBinary.charCodeAt(i);
      }
      
      const closeArr = encoder.encode(closeDelimiter);
      
      bodyBuffer = new Uint8Array(metaArr.length + binaryArr.length + closeArr.length);
      bodyBuffer.set(metaArr, 0);
      bodyBuffer.set(binaryArr, metaArr.length);
      bodyBuffer.set(closeArr, metaArr.length + binaryArr.length);
    }

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length)
      },
      body: bodyBuffer
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: responseText || response.statusText };
    }

    if (!response.ok) {
      throw new Error(`Drive UPLOAD failed: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    }
    return data;
  },

  async deleteFile(fileId: string, env: any = {}) {
    const token = await getGoogleAccessToken(env);
    const url = `${BASE_URL}/files/${fileId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Drive DELETE failed: ${responseText}`);
    }
    return true;
  },

  async trashFile(fileId: string, env: any = {}) {
    const token = await getGoogleAccessToken(env);
    const url = `${BASE_URL}/files/${fileId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trashed: true })
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Drive TRASH failed: ${responseText}`);
    }
    return true;
  }
};
