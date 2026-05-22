import React, { useState, useEffect } from 'react';

const API_URL = 'https://www.emsifa.com/api-wilayah-indonesia/api';

interface Province { id: string; name: string; }
interface Regency { id: string; name: string; }
interface District { id: string; name: string; }
interface Village { id: string; name: string; }

interface AddressSelectProps {
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  onChange: (field: string, value: string) => void;
}

const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export function AddressSelects({ provinsi, kota, kecamatan, kelurahan, onChange }: AddressSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/provinces.json`)
      .then(res => res.json())
      .then(d => {
        if (active) setProvinces(d.map((item: any) => ({...item, name: toTitleCase(item.name)})));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const provId = provinces.find(p => p.name === provinsi)?.id;
    if (provId) {
      fetch(`${API_URL}/regencies/${provId}.json`)
        .then(res => res.json())
        .then(d => {
           if (active) setRegencies(d.map((item: any) => ({...item, name: toTitleCase(item.name)})));
        })
        .catch(() => {});
    } else {
      setRegencies([]);
    }
    return () => { active = false; };
  }, [provinsi, provinces]);

  useEffect(() => {
    let active = true;
    const regId = regencies.find(r => r.name === kota)?.id;
    if (regId) {
      fetch(`${API_URL}/districts/${regId}.json`)
        .then(res => res.json())
        .then(d => {
           if (active) setDistricts(d.map((item: any) => ({...item, name: toTitleCase(item.name)})));
        })
        .catch(() => {});
    } else {
      setDistricts([]);
    }
    return () => { active = false; };
  }, [kota, regencies]);

  useEffect(() => {
    let active = true;
    const distId = districts.find(d => d.name === kecamatan)?.id;
    if (distId) {
      fetch(`${API_URL}/villages/${distId}.json`)
        .then(res => res.json())
        .then(d => {
           if (active) {
             let vills = d.map((item: any) => ({...item, name: toTitleCase(item.name)}));
             if (kecamatan.toUpperCase() === 'KEMBANGAN' && !vills.find((v: any) => v.name.toUpperCase() === 'SRENGSENG')) {
                 vills.push({ id: '3174010002', name: 'Srengseng' });
                 vills.sort((a: any, b: any) => a.name.localeCompare(b.name));
             }
             setVillages(vills);
           }
        })
        .catch(() => {});
    } else {
      setVillages([]);
    }
    return () => { active = false; };
  }, [kecamatan, districts]);

  return (
    <div className="grid grid-cols-1 gap-1">
      <div>
        <label className="block text-slate-500 mb-0.5">Provinsi</label>
        <select value={provinsi} onChange={e => { onChange('provinsi', e.target.value); onChange('kota', ''); onChange('kecamatan', ''); onChange('kelurahan', ''); }} className="w-full p-1 border rounded bg-white">
          <option value="">Pilih Provinsi</option>
          {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-slate-500 mb-0.5">Kota / Kabupaten</label>
        <select value={kota} onChange={e => { onChange('kota', e.target.value); onChange('kecamatan', ''); onChange('kelurahan', ''); }} disabled={!provinsi} className="w-full p-1 border rounded bg-white disabled:bg-slate-100">
          <option value="">Pilih Kota/Kab</option>
          {regencies.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-slate-500 mb-0.5">Kecamatan</label>
        <select value={kecamatan} onChange={e => { onChange('kecamatan', e.target.value); onChange('kelurahan', ''); }} disabled={!kota} className="w-full p-1 border rounded bg-white disabled:bg-slate-100">
          <option value="">Pilih Kecamatan</option>
          {districts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-slate-500 mb-0.5">Kelurahan / Desa</label>
        <select value={kelurahan} onChange={e => onChange('kelurahan', e.target.value)} disabled={!kecamatan} className="w-full p-1 border rounded bg-white disabled:bg-slate-100">
          <option value="">Pilih Kelurahan</option>
          {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
        </select>
      </div>
    </div>
  );
}
