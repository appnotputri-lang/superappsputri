import { getFirestoreServiceAccountToken } from './google-service-account-auth';
import firebaseConfig from '../../firebase-applet-config.json';

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const API_KEY = firebaseConfig.apiKey;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// Helper to convert Firestore JSON to simple JS Object
function fromFirestore(fields: any) {
  const result: any = {};
  if (!fields) return result;
  for (const key in fields) {
    const value = fields[key];
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.mapValue !== undefined) result[key] = fromFirestore(value.mapValue.fields);
    else if (value.arrayValue !== undefined) result[key] = (value.arrayValue.values || []).map((v: any) => {
      const inner = fromFirestore({ item: v });
      return inner.item;
    });
    else if (value.nullValue !== undefined) result[key] = null;
  }
  return result;
}

// Helper to convert JS Object to Firestore JSON
function toFirestore(data: any) {
  const fields: any = {};
  for (const key in data) {
    const val = data[key];
    if (val === null) fields[key] = { nullValue: null };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'number') {
      if (Number.isInteger(val)) fields[key] = { integerValue: val.toString() };
      else fields[key] = { doubleValue: val };
    }
    else if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (val instanceof Date) fields[key] = { timestampValue: val.toISOString() };
    else if (Array.isArray(val)) {
      fields[key] = { arrayValue: { values: val.map(v => toFirestore({ v }).v) } };
    }
    else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestore(val) } };
    }
  }
  return fields;
}

const getHeaders = async (env: any = {}) => {
  const token = await getFirestoreServiceAccountToken(env);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-goog-api-key': API_KEY
  };
};

export const firestoreRest = {
  async getDocument(collection: string, docId: string, env: any = {}) {
    const headers = await getHeaders(env);
    const fullPath = `${collection}/${docId}`.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${BASE_URL}/${fullPath}`, {
      headers
    });
    
    if (response.status === 404) return null;
    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Firestore GET failed: ${JSON.stringify(data)}`);
    
    return {
      id: docId,
      ...fromFirestore(data.fields)
    };
  },

  async updateDocument(collection: string, docId: string, data: any, env: any = {}) {
    const headers = await getHeaders(env);
    const fields = toFirestore(data);
    
    // updateMask determines which fields are replaced
    const updateMask = Object.keys(data).map(key => `updateMask.fieldPaths=${key}`).join('&');
    
    const fullPath = `${collection}/${docId}`.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${BASE_URL}/${fullPath}?${updateMask}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });

    const result = await response.json() as any;
    if (!response.ok) throw new Error(`Firestore PATCH failed: ${JSON.stringify(result)}`);
    return result;
  },

  async setDocument(collection: string, docId: string, data: any, env: any = {}) {
    const headers = await getHeaders(env);
    const fields = toFirestore(data);
    const fullPath = `${collection}/${docId}`.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${BASE_URL}/${fullPath}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });

    const result = await response.json() as any;
    if (!response.ok) throw new Error(`Firestore SET failed: ${JSON.stringify(result)}`);
    return result;
  },

  async listDocuments(collection: string, pageSize = 100, pageToken?: string, env: any = {}) {
    const headers = await getHeaders(env);
    let url = `${BASE_URL}/${collection}?pageSize=${pageSize}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url, {
      headers
    });

    const data = await response.json() as any;
    if (!response.ok) throw new Error(`Firestore LIST failed: ${JSON.stringify(data)}`);

    return {
      documents: (data.documents || []).map((doc: any) => ({
        id: doc.name.split('/').pop(),
        ...fromFirestore(doc.fields)
      })),
      nextPageToken: data.nextPageToken
    };
  },

  async deleteDocument(collection: string, docId: string, env: any = {}) {
    const headers = await getHeaders(env);
    const fullPath = `${collection}/${docId}`.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${BASE_URL}/${fullPath}`, {
      method: 'DELETE',
      headers
    });

    if (response.status === 404) return true;
    if (!response.ok) {
      const data = await response.json() as any;
      throw new Error(`Firestore DELETE failed: ${JSON.stringify(data)}`);
    }
    return true;
  }
};
