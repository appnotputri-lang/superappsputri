import React, { useState, useEffect } from 'react';

// Using emsifa API for regions
const API_URL = 'https://ibnux.github.io/data-indonesia';

interface Province { id: string; nama: string; }
interface Regency { id: string; nama: string; }
interface District { id: string; nama: string; }
interface Village { id: string; nama: string; }

interface RegionSelectProps {
  prefix: string;
  data: any;
  onChange: (e: { target: { name: string; value: string } }) => void;
  FieldRow: any;
  Select: any;
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export function RegionSelects({ prefix, data, onChange, FieldRow, Select }: RegionSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const valProvinsi = data[`${prefix}Provinsi`] || '';
  const valKota = data[`${prefix}Kota`] || '';
  const valKecamatan = data[`${prefix}Kecamatan`] || '';
  const valKelurahan = data[`${prefix}Kelurahan`] || '';

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/provinsi.json`)
      .then(res => res.json())
      .then(d => { if (active) setProvinces(d.map((item: any) => ({...item, nama: toTitleCase(item.nama)}))) })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const provId = provinces.find(p => p.nama.toUpperCase() === valProvinsi.toUpperCase())?.id;
    if (provId) {
      fetch(`${API_URL}/kabupaten/${provId}.json`)
        .then(res => res.json())
        .then(d => { if (active) setRegencies(d.map((item: any) => ({...item, nama: toTitleCase(item.nama)}))) })
        .catch(() => {});
    } else {
      setRegencies([]);
    }
    return () => { active = false; };
  }, [valProvinsi, provinces]);

  useEffect(() => {
    let active = true;
    const regId = regencies.find(r => r.nama.toUpperCase() === valKota.toUpperCase())?.id;
    if (regId) {
      fetch(`${API_URL}/kecamatan/${regId}.json`)
        .then(res => res.json())
        .then(d => { if (active) setDistricts(d.map((item: any) => ({...item, nama: toTitleCase(item.nama)}))) })
        .catch(() => {});
    } else {
      setDistricts([]);
    }
    return () => { active = false; };
  }, [valKota, regencies]);

  useEffect(() => {
    let active = true;
    const distId = districts.find(d => d.nama.toUpperCase() === valKecamatan.toUpperCase())?.id;
    if (distId) {
      fetch(`${API_URL}/kelurahan/${distId}.json`)
        .then(res => res.json())
        .then(d => {
           if (active) {
             let vills = d.map((item: any) => ({...item, nama: toTitleCase(item.nama)}));
             vills.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
             setVillages(vills);
           }
        })
        .catch(() => {});
    } else {
      setVillages([]);
    }
    return () => { active = false; };
  }, [valKecamatan, districts]);

  return (
    <>
      <FieldRow label="Provinsi">
        <Select
          name={`${prefix}Provinsi`}
          value={valProvinsi}
          onChange={(e: any) => { 
            onChange(e); 
            onChange({ target: { name: `${prefix}Kota`, value: '' } });
            onChange({ target: { name: `${prefix}Kecamatan`, value: '' } });
            onChange({ target: { name: `${prefix}Kelurahan`, value: '' } });
          }}
        >
          <option value="">Pilih Provinsi</option>
          {provinces.map(p => <option key={p.id} value={p.nama}>{p.nama}</option>)}
        </Select>
      </FieldRow>

      <FieldRow label="Kota/Kabupaten">
        <Select
          name={`${prefix}Kota`}
          value={valKota}
          onChange={(e: any) => {
            onChange(e);
            onChange({ target: { name: `${prefix}Kecamatan`, value: '' } });
            onChange({ target: { name: `${prefix}Kelurahan`, value: '' } });
          }}
          disabled={!valProvinsi}
        >
          <option value="">Pilih Kota/Kabupaten</option>
          {regencies.map(r => <option key={r.id} value={r.nama}>{r.nama}</option>)}
        </Select>
      </FieldRow>

      <FieldRow label="Kecamatan">
        <Select
          name={`${prefix}Kecamatan`}
          value={valKecamatan}
          onChange={(e: any) => {
            onChange(e);
            onChange({ target: { name: `${prefix}Kelurahan`, value: '' } });
          }}
          disabled={!valKota}
        >
          <option value="">Pilih Kecamatan</option>
          {districts.map(d => <option key={d.id} value={d.nama}>{d.nama}</option>)}
        </Select>
      </FieldRow>

      <FieldRow label="Kelurahan/Desa">
        <Select
          name={`${prefix}Kelurahan`}
          value={valKelurahan}
          onChange={onChange}
          disabled={!valKecamatan}
        >
          <option value="">Pilih Kelurahan/Desa</option>
          {villages.map(v => <option key={v.id} value={v.nama}>{v.nama}</option>)}
        </Select>
      </FieldRow>
    </>
  );
}
