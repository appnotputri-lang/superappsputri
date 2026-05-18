import React, { useState, useEffect } from 'react';

// Using emsifa API for regions
const API_URL = 'https://www.emsifa.com/api-wilayah-indonesia/api';

interface Province { id: string; name: string; }
interface Regency { id: string; name: string; }
interface District { id: string; name: string; }
interface Village { id: string; name: string; }

interface RegionSelectProps {
  prefix: string;
  data: any;
  onChange: (e: { target: { name: string; value: string } }) => void;
  FieldRow: any;
  Select: any;
}

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
    fetch(`${API_URL}/provinces.json`)
      .then(res => res.json())
      .then(d => setProvinces(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const provId = provinces.find(p => p.name === valProvinsi)?.id;
    if (provId) {
      fetch(`${API_URL}/regencies/${provId}.json`)
        .then(res => res.json())
        .then(d => setRegencies(d))
        .catch(() => {});
    } else {
      setRegencies([]);
    }
  }, [valProvinsi, provinces]);

  useEffect(() => {
    const regId = regencies.find(r => r.name === valKota)?.id;
    if (regId) {
      fetch(`${API_URL}/districts/${regId}.json`)
        .then(res => res.json())
        .then(d => setDistricts(d))
        .catch(() => {});
    } else {
      setDistricts([]);
    }
  }, [valKota, regencies]);

  useEffect(() => {
    const distId = districts.find(d => d.name === valKecamatan)?.id;
    if (distId) {
      fetch(`${API_URL}/villages/${distId}.json`)
        .then(res => res.json())
        .then(d => {
           let vills = [...d];
           if (valKecamatan.toUpperCase() === 'KEMBANGAN' && !vills.find((v: any) => v.name.toUpperCase() === 'SRENGSENG')) {
               vills.push({ id: '3174010002', name: 'SRENGSENG' });
               vills.sort((a: any, b: any) => a.name.localeCompare(b.name));
           }
           setVillages(vills);
        })
        .catch(() => {});
    } else {
      setVillages([]);
    }
  }, [valKecamatan, districts]);

  return (
    <>
      <FieldRow label="Provinsi">
        <Select
          name={`${prefix}Provinsi`}
          value={valProvinsi}
          onChange={onChange}
        >
          <option value="">Pilih Provinsi</option>
          {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </Select>
      </FieldRow>

      <FieldRow label="Kota/Kabupaten">
        <Select
          name={`${prefix}Kota`}
          value={valKota}
          onChange={onChange}
          disabled={!valProvinsi}
        >
          <option value="">Pilih Kota/Kabupaten</option>
          {regencies.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </Select>
      </FieldRow>

      <FieldRow label="Kecamatan">
        <Select
          name={`${prefix}Kecamatan`}
          value={valKecamatan}
          onChange={onChange}
          disabled={!valKota}
        >
          <option value="">Pilih Kecamatan</option>
          {districts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
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
          {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
        </Select>
      </FieldRow>
    </>
  );
}
