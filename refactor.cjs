const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/project-engine/components/ProjectDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement code:
const replacement = `
  const syncDeedInfoAndClientProfile = async (): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
      if (!project) return resolve([]);

      const mapOptionToDocType = (typeStr: string): 'SK' | 'SP_DATA_PERSEROAN' | 'SP_ANGGARAN_DASAR' | 'SP' => {
        const s = typeStr.toLowerCase();
        if (s.includes('perubahan data perseroan')) return 'SP_DATA_PERSEROAN';
        if (s.includes('perubahan anggaran dasar')) return 'SP_ANGGARAN_DASAR';
        if (s.includes('sk')) return 'SK';
        return 'SP';
      };

      const validSkSpDocs: SkSpDocument[] = skSpEntries
        .filter(e => e.number.trim().length > 0)
        .map(e => ({
          id: e.id || Math.random().toString(36).substring(7),
          type: mapOptionToDocType(e.type),
          number: e.number.trim(),
          date: e.date || deedDate
        }));

      const firstSkSp = validSkSpDocs[0];
      const finalNotaryName = notarySelectionType === 'saya' ? 'Nukantini Putri Parincha' : notaryName.trim();

      const updatedMetadata = {
        ...(project.metadata || {}),
        deedNumber: deedNumber.trim(),
        deedDate,
        notarySelectionType,
        notaryName: finalNotaryName,
        notaryLocation: notaryLocation.trim(),
        skSpEntries,
        skSpType: firstSkSp ? firstSkSp.type : (skSpEntries[0]?.type || ''),
        skSpNumber: firstSkSp ? firstSkSp.number : (skSpEntries[0]?.number || ''),
        skSpDate: firstSkSp ? firstSkSp.date : (skSpEntries[0]?.date || '')
      };

      const syncedItems: string[] = [];
      const warningsList: string[] = [];

      const formDoc = documents.find(d => d.refId);
      const refIdToUse = project.metadata?.refId || formDoc?.refId || projectId;
      const formObj = await fetchDocRecordData({
        id: 'temp',
        name: project.title || '',
        type: 'form',
        refId: refIdToUse,
        uploadedAt: new Date().toISOString()
      }, true);

      let targetCollection = '';
      if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
        targetCollection = 'projects';
      } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
        targetCollection = 'rupst_projects';
      } else if (project.jobType === 'pendirian_pt') {
        targetCollection = 'pendirian_projects';
      }

      let formUpdatePayload: any = null;
      if (refIdToUse && targetCollection) {
        formUpdatePayload = {
          notaryNumber: deedNumber.trim(),
          notaryDate: deedDate,
          notaryName: finalNotaryName,
          notaryDomicile: notaryLocation.trim(),
          skSpDocuments: validSkSpDocs,
          updatedAt: new Date().toISOString()
        };
        if (firstSkSp) {
          formUpdatePayload.skNumber = firstSkSp.number;
          formUpdatePayload.skDate = firstSkSp.date || deedDate;
        }
      }

      let profileUpdate: any = null;
      const changesList: { category: string; before: string; after: string }[] = [];

      if (project.clientId) {
        const clientDocRef = doc(db, 'profiles', project.clientId);
        const clientSnap = await getDoc(clientDocRef);
        const freshClient = clientSnap.exists() ? (clientSnap.data() as CompanyProfile) : null;

        profileUpdate = { updatedAt: new Date().toISOString() };

        if (formObj) {
          if (formObj.companyName || formObj.namaPt) {
            profileUpdate.companyName = formObj.companyName || formObj.namaPt;
            if (profileUpdate.companyName !== freshClient?.companyName) {
              syncedItems.push('Nama Perusahaan');
            }
          }
          if (formObj.companyType) {
            profileUpdate.companyType = formObj.companyType;
          }
          if (formObj.fullAddress || formObj.address?.fullAddress) {
            profileUpdate.fullAddress = formObj.fullAddress || formObj.address?.fullAddress;
            syncedItems.push('Alamat Utama');
          }
          if (formObj.newAddress) {
            profileUpdate.newAddress = formObj.newAddress;
          }
          
          // TASK 1: DOMICILE SYNC
          if (formObj.resolutions?.domicile && formObj.domicile) {
            profileUpdate.oldDomicile = freshClient?.domicile || '';
            profileUpdate.domicile = formObj.domicile;
            if (formObj.domicileStyle) {
              profileUpdate.domicileStyle = formObj.domicileStyle;
            }
            if (formObj.kedudukanPT) {
              profileUpdate.kedudukanPT = formObj.kedudukanPT;
            }
            syncedItems.push(\`Kedudukan (Domisili)\`);
          }

          if (formObj.kbliItems && formObj.kbliItems.length > 0) {
            profileUpdate.kbliItems = formObj.kbliItems;
            syncedItems.push(\`KBLI (\${formObj.kbliItems.length} item)\`);
          }

          const formNominal = Number(formObj.shareValue || formObj.nilaiNominal || formObj.nilaiPerLembar || formObj.originalSharePrice || (freshClient as any)?.shareValue || (freshClient as any)?.nilaiNominal || freshClient?.originalSharePrice || 0);
          const baseFromLembar = (formObj.modalDasarLembar && formNominal) ? (formObj.modalDasarLembar * formNominal) : 0;
          const paidFromLembar = (formObj.modalDisetorLembar && formNominal) ? (formObj.modalDisetorLembar * formNominal) : 0;

          const formPaid = Number(formObj.targetCapitalPaid || formObj.modalDisetor || formObj.originalCapitalPaid || formObj.paidUpCapital || paidFromLembar || 0);
          const formBase = Number(formObj.targetCapitalBase || formObj.modalDasar || formObj.originalCapitalBase || formObj.authorizedCapital || baseFromLembar || 0);

          if (formNominal > 0) {
            profileUpdate.shareValue = formNominal;
            profileUpdate.originalSharePrice = formNominal;
          }

          if (formBase > 0) {
            profileUpdate.targetCapitalBase = formBase;
            profileUpdate.originalCapitalBase = formBase;
            const shareVal = formNominal > 0 ? formNominal : 1000000;
            profileUpdate.originalAuthorizedShares = formBase / shareVal;
            profileUpdate.totalSharesBase = formBase / shareVal;
          }

          if (formPaid > 0) {
            profileUpdate.targetCapitalPaid = formPaid;
            profileUpdate.originalCapitalPaid = formPaid;
            const shareVal = formNominal > 0 ? formNominal : 1000000;
            profileUpdate.originalTotalShares = formPaid / shareVal;
            profileUpdate.totalSharesPaid = formPaid / shareVal;

            if (freshClient?.targetCapitalPaid !== formPaid) {
              syncedItems.push(\`Modal Disetor (Rp \${formPaid.toLocaleString('id-ID')})\`);
            } else {
              syncedItems.push('Modal Disetor / Dasar');
            }
          }

          // TASK 2: DIAGNOSTIC LOG FOR SHAREHOLDERS
          console.log('--- DIAGNOSTIC: SHAREHOLDERS SYNC ---');
          console.log('formObj.resolutions:', formObj.resolutions);
          console.log('formObj.finalShareholders (raw):', formObj.finalShareholders);
          console.log('freshClient?.shareholders (old):', freshClient?.shareholders);
          console.log('---------------------------------------');

          const baseShareholdersSource = (formObj.finalShareholders && formObj.finalShareholders.length > 0)
            ? formObj.finalShareholders
            : (formObj.shareholders || formObj.pemegangSaham || freshClient?.shareholders || []);

          let workingShareholders: any[] = JSON.parse(JSON.stringify(baseShareholdersSource || []));
          const isUsingFinalShareholders = !!(formObj.finalShareholders && formObj.finalShareholders.length > 0);

          if (!isUsingFinalShareholders && formObj.resolutions?.capitalPaid) {
            const subscriptions = formObj.capitalSubscriptionsNew || [];
            subscriptions.forEach((sub: any) => {
              const subShares = Number(sub.sharesCount || sub.shares || 0);
              if (subShares <= 0) return;
              const subName = sub.subscriberName || '';
              const subNik = sub.subscriberNik || '';
              let toSh = workingShareholders.find((s: any) => (sub.id && s.id === sub.id) || (subNik && s.nik && s.nik.trim() === subNik.trim()) || (subName && s.name && s.name.trim().toUpperCase() === subName.trim().toUpperCase()));
              if (toSh) {
                toSh.sharesOwned = (toSh.sharesOwned || 0) + subShares;
              } else if (subName) {
                workingShareholders.push({
                  id: sub.id || Math.random().toString(36).substring(7),
                  name: subName,
                  nik: subNik,
                  salutation: sub.salutation || 'Tuan',
                  sharesOwned: subShares,
                  nationality: 'Indonesia',
                  address: sub.address || {}
                });
              }
            });
          }

          const transfers = formObj.shareTransfersNew || formObj.shareTransfers || [];
          if (transfers.length > 0 && formObj.resolutions?.shareholders) {
            transfers.forEach((t: any) => {
              const transferShares = Number(t.sharesTransferred || t.shares || 0);
              if (transferShares <= 0) return;
              const fromSh = workingShareholders.find((s: any) => s.id === t.fromShareholderId || (s.name && t.fromName && s.name.trim().toUpperCase() === t.fromName.trim().toUpperCase()));
              const targetDetail = t.toDetail || {};
              const toName = t.toName || targetDetail.name || '';
              const toNik = t.toNik || targetDetail.nik || '';
              let toSh = workingShareholders.find((s: any) => (s.id && (s.id === t.toShareholderId || s.id === targetDetail.id)) || (toNik && s.nik && s.nik.trim() === toNik.trim()) || (toName && s.name && s.name.trim().toUpperCase() === toName.trim().toUpperCase()));
              if (toSh) {
                Object.assign(toSh, { ...targetDetail, ...toSh, sharesOwned: (toSh.sharesOwned || 0) + (isUsingFinalShareholders ? 0 : transferShares), address: targetDetail.address || toSh.address });
              } else if (toName || targetDetail.name) {
                workingShareholders.push({
                  ...targetDetail,
                  id: targetDetail.id || t.toShareholderId || Math.random().toString(36).substring(7),
                  name: toName || targetDetail.name,
                  nik: toNik || targetDetail.nik || '',
                  salutation: t.toSalutation || targetDetail.salutation || 'Tuan',
                  sharesOwned: transferShares,
                  address: targetDetail.address
                });
              }
              if (fromSh && !isUsingFinalShareholders) {
                fromSh.sharesOwned = Math.max(0, (fromSh.sharesOwned || 0) - transferShares);
              }
            });
          }

          const initialShareholdersPool = [...(formObj.shareholders || []), ...(freshClient?.shareholders || []), ...(freshClient?.finalShareholders || [])];
          workingShareholders = workingShareholders.map((sh: any) => {
            const matchingOld = initialShareholdersPool.find((oldSh: any) => (oldSh.id && oldSh.id === sh.id) || (oldSh.nik && sh.nik && oldSh.nik.trim() === sh.nik.trim()) || (oldSh.name && sh.name && oldSh.name.trim().toUpperCase() === sh.name.trim().toUpperCase()));
            const oldAddr = matchingOld?.address || {};
            const newAddr = sh.address || {};
            const formattedAddress = (sh.address || matchingOld?.address) ? {
              rt: newAddr.rt || oldAddr.rt || '', rw: newAddr.rw || oldAddr.rw || '', kelurahan: newAddr.kelurahan || oldAddr.kelurahan || '', kecamatan: newAddr.kecamatan || oldAddr.kecamatan || '', city: newAddr.city || oldAddr.city || '', province: newAddr.province || oldAddr.province || '', fullAddress: newAddr.fullAddress || oldAddr.fullAddress || (typeof newAddr === 'string' ? newAddr : typeof oldAddr === 'string' ? oldAddr : '')
            } : undefined;
            return {
              ...(matchingOld || {}), ...sh, id: sh.id || Math.random().toString(36).substring(7), name: sh.name || '', sharesOwned: Number(sh.sharesOwned ?? sh.finalShares ?? sh.shares ?? sh.jumlahSaham ?? 0), address: formattedAddress, nik: sh.nik || matchingOld?.nik || '', npwp: sh.npwp || matchingOld?.npwp || '', occupation: sh.occupation || matchingOld?.occupation || '', birthCity: sh.birthCity || matchingOld?.birthCity || '', birthDate: sh.birthDate || matchingOld?.birthDate || '', salutation: sh.salutation || matchingOld?.salutation || 'Tuan', nationality: sh.nationality || matchingOld?.nationality || 'Indonesia', managementPosition: sh.managementPosition || matchingOld?.managementPosition || '', isManagement: sh.isManagement ?? matchingOld?.isManagement
            };
          }).filter((sh: any) => sh.sharesOwned > 0 || (sh.name && sh.name.trim().length > 0));

          if (workingShareholders.length > 0) {
            profileUpdate.shareholders = workingShareholders;
            profileUpdate.finalShareholders = workingShareholders;
          }

          // TASK 2: DIAGNOSTIC LOG FOR MANAGEMENT
          console.log('--- DIAGNOSTIC: MANAGEMENT SYNC ---');
          console.log('formObj.resolutions:', formObj.resolutions);
          console.log('formObj.managementAppointments (raw):', formObj.managementAppointments);
          console.log('formObj.managementDismissals (raw):', formObj.managementDismissals);
          console.log('freshClient?.newManagementItems (old):', freshClient?.newManagementItems);
          console.log('workingShareholders:', workingShareholders.map((s: any) => ({ name: s.name, isMgmt: s.isManagement })));
          console.log('---------------------------------------');

          const oldManagers = [...(freshClient?.newManagementItems || []), ...(freshClient?.shareholders || []).filter((s: any) => s.isManagement).map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(7), name: s.name, position: s.managementPosition || "DIREKTUR", nik: s.nik || "" }))];
          const uniqueOldManagers: any[] = [];
          const seenMgmt = new Set<string>();
          oldManagers.forEach((om: any) => {
            if (!om || !om.name) return;
            const key = \`\${om.name.toUpperCase().trim()}_\${(om.position || 'DIREKTUR').toUpperCase().trim()}\`;
            if (!seenMgmt.has(key)) { seenMgmt.add(key); uniqueOldManagers.push(om); }
          });
          
          const hasExplicitDismissals = formObj.managementDismissals && formObj.managementDismissals.length > 0;
          const hasExplicitAppointments = formObj.managementAppointments && formObj.managementAppointments.length > 0;

          if (hasExplicitDismissals || hasExplicitAppointments) {
            const dismissedNames = new Set((formObj.managementDismissals || []).map((d: any) => (d.name || d.dismissedName || '').toUpperCase().trim()));
            const managersToAppoint: any[] = [];
            (formObj.managementAppointments || []).forEach((a: any) => { managersToAppoint.push({ ...a, id: a.id || Math.random().toString(36).substring(7), name: a.name || '', position: a.position || 'DIREKTUR', nik: a.nik || '' }); });
            (formObj.managementDismissals || []).forEach((d: any) => {
              if ((d.replacementType === 'MANUAL' || d.replacementType === 'NEW') && (d.replacedByDetail || d.replacedByName)) {
                const detail = d.replacedByDetail || {};
                managersToAppoint.push({ ...detail, id: detail.id || Math.random().toString(36).substring(7), name: d.replacedByName || detail.name || '', position: d.replacedByPosition || detail.position || detail.managementPosition || 'DIREKTUR', nik: d.replacedByNik || detail.nik || '', salutation: d.replacedBySalutation || detail.salutation || 'Tuan', address: detail.address });
              }
            });
            const remainingOldManagers = uniqueOldManagers.filter(om => om && om.name && !dismissedNames.has(om.name.toUpperCase().trim()));
            profileUpdate.newManagementItems = [...remainingOldManagers, ...managersToAppoint];
            console.warn("[Sync Management] Derived management from explicit appointments/dismissals.", profileUpdate.newManagementItems);
          } else {
            const activeMgmt = (workingShareholders || []).filter((s: any) => s.isManagement || (s.managementPosition && s.managementPosition.trim().length > 0)).map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(7), name: s.name, position: s.managementPosition || 'DIREKTUR', nik: s.nik || '' }));
            if (activeMgmt.length > 0) {
              profileUpdate.newManagementItems = activeMgmt;
              console.warn("[Sync Management] Derived management from workingShareholders.", profileUpdate.newManagementItems);
            } else {
              profileUpdate.newManagementItems = uniqueOldManagers;
              console.warn("[Sync Management] Fallback to uniqueOldManagers (No changes detected).", profileUpdate.newManagementItems);
            }
          }

          if (profileUpdate.newManagementItems) {
            profileUpdate.newManagementItems = profileUpdate.newManagementItems.map((m: any) => {
              const sourceSh = workingShareholders.find((s: any) => (s.name || '').trim().toUpperCase() === (m.name || '').trim().toUpperCase());
              const sourceClient = freshClient?.newManagementItems?.find((c: any) => (c.name || '').trim().toUpperCase() === (m.name || '').trim().toUpperCase());
              const source = sourceSh || sourceClient;
              return { ...m, salutation: m.salutation || source?.salutation || 'Tuan', birthCity: m.birthCity || source?.birthCity || '', birthDate: m.birthDate || source?.birthDate || '', occupation: m.occupation || source?.occupation || '', nationality: m.nationality || source?.nationality || 'Indonesia', address: m.address || source?.address };
            });
          }

          // Merge Deed and SK details
          if (project.jobType === 'pendirian_pt') {
            profileUpdate.establishmentDeedNumber = deedNumber.trim();
            profileUpdate.establishmentDeedDate = deedDate;
            profileUpdate.establishmentNotary = finalNotaryName;
            profileUpdate.establishmentNotaryTitle = notarySelectionType === 'saya' ? 'Sarjana Hukum, Magister Kenotariatan' : '';
            profileUpdate.establishmentNotaryDomicile = notaryLocation.trim();
            if (firstSkSp) {
              profileUpdate.establishmentSkNumber = firstSkSp.number;
              profileUpdate.establishmentSkDate = firstSkSp.date || deedDate;
            }
            syncedItems.push('Data Akta Pendirian & SK');
          } else {
            profileUpdate.latestAmendmentDeedNumber = deedNumber.trim();
            profileUpdate.latestAmendmentDeedDate = deedDate;
            profileUpdate.latestAmendmentNotary = finalNotaryName;
            if (firstSkSp) {
              profileUpdate.latestAmendmentSkNumber = firstSkSp.number;
              profileUpdate.latestAmendmentSkDate = firstSkSp.date || deedDate;
            }
            const existingDeeds = freshClient?.amendmentDeeds || [];
            const newAmendmentDeed: AmendmentDeed = {
              id: Math.random().toString(36).substring(7), number: deedNumber.trim(), date: deedDate, notary: finalNotaryName, notaryTitle: notarySelectionType === 'saya' ? 'Sarjana Hukum, Magister Kenotariatan' : '', notaryDomicile: notaryLocation.trim(), skNumber: firstSkSp ? firstSkSp.number : '', skDate: firstSkSp ? firstSkSp.date : deedDate, skSpDocuments: validSkSpDocs
            };
            const duplicateIndex = existingDeeds.findIndex(d => d.number === deedNumber.trim());
            if (duplicateIndex !== -1) {
              const updatedDeeds = [...existingDeeds];
              updatedDeeds[duplicateIndex] = { ...newAmendmentDeed, id: existingDeeds[duplicateIndex].id || newAmendmentDeed.id };
              profileUpdate.amendmentDeeds = updatedDeeds;
            } else {
              profileUpdate.amendmentDeeds = [newAmendmentDeed, ...existingDeeds];
            }
            syncedItems.push(\`Data Akta (\${deedNumber.trim()})\`);
          }

          // Build changes UI
          if (profileUpdate.companyName && profileUpdate.companyName !== freshClient?.companyName) {
            changesList.push({ category: 'Nama Perusahaan', before: freshClient?.companyName || '-', after: profileUpdate.companyName });
          }
          if (profileUpdate.domicile && profileUpdate.domicile !== freshClient?.domicile) {
            changesList.push({ category: 'Kedudukan / Domisili', before: freshClient?.domicile || '-', after: profileUpdate.domicile });
          }
          if (profileUpdate.fullAddress && profileUpdate.fullAddress !== freshClient?.fullAddress) {
            changesList.push({ category: 'Alamat Utama', before: freshClient?.fullAddress || '-', after: profileUpdate.fullAddress });
          }

          const oldKbliStr = JSON.stringify((freshClient?.kbliItems || []).map((k: any) => k.code));
          const newKbliStr = JSON.stringify((profileUpdate.kbliItems || []).map((k: any) => k.code));
          if (profileUpdate.kbliItems && newKbliStr !== oldKbliStr) {
            changesList.push({ category: 'KBLI', before: \`\${freshClient?.kbliItems?.length || 0} item\`, after: \`\${profileUpdate.kbliItems.length} item\` });
          } else if (formObj.resolutions?.kbli && newKbliStr === oldKbliStr) {
            warningsList.push('Resolusi KBLI dicentang, tapi tidak ada perubahan data KBLI yang terdeteksi.');
          }

          const oldMgmtSig = JSON.stringify((freshClient?.newManagementItems || []).map((m: any) => ({ name: (m.name || '').trim().toUpperCase(), pos: (m.position || '').trim().toUpperCase() })));
          const newMgmtSig = JSON.stringify((profileUpdate.newManagementItems || []).map((m: any) => ({ name: (m.name || '').trim().toUpperCase(), pos: (m.position || '').trim().toUpperCase() })));
          if (profileUpdate.newManagementItems && newMgmtSig !== oldMgmtSig) {
            syncedItems.push(\`Susunan Pengurus (\${profileUpdate.newManagementItems.length} orang)\`);
            const beforeStr = (freshClient?.newManagementItems || []).map((m: any) => \`\${m.name} (\${m.position})\`).join('\\n');
            const afterStr = profileUpdate.newManagementItems.map((m: any) => \`\${m.name} (\${m.position})\`).join('\\n');
            changesList.push({ category: 'Susunan Pengurus', before: beforeStr || '-', after: afterStr || '-' });
          } else if (formObj.resolutions?.management && newMgmtSig === oldMgmtSig) {
            warningsList.push('Resolusi Pengurus dicentang, tapi tidak ada perubahan susunan Direksi/Komisaris yang terdeteksi.');
          }

          const oldShSig = JSON.stringify((freshClient?.shareholders || []).map((s: any) => ({ name: (s.name || '').trim().toUpperCase(), shares: s.sharesOwned || 0 })));
          const newShSig = JSON.stringify((profileUpdate.shareholders || []).map((s: any) => ({ name: (s.name || '').trim().toUpperCase(), shares: s.sharesOwned || 0 })));
          if (profileUpdate.shareholders && newShSig !== oldShSig) {
            syncedItems.push(\`Susunan Pemegang Saham (\${profileUpdate.shareholders.length} orang)\`);
            const beforeStr = (freshClient?.shareholders || []).map((s: any) => \`\${s.name} (\${s.sharesOwned} saham)\`).join('\\n');
            const afterStr = profileUpdate.shareholders.map((s: any) => \`\${s.name} (\${s.sharesOwned} saham)\`).join('\\n');
            changesList.push({ category: 'Pemegang Saham', before: beforeStr || '-', after: afterStr || '-' });
          } else if (formObj.resolutions?.shareholders && newShSig === oldShSig) {
            warningsList.push('Resolusi Pemegang Saham dicentang, tapi tidak ada perubahan pemegang saham yang terdeteksi.');
          }
          
          if (formPaid > 0 && freshClient?.targetCapitalPaid !== formPaid) {
            changesList.push({ category: 'Modal Disetor', before: \`Rp \${(freshClient?.targetCapitalPaid || 0).toLocaleString('id-ID')}\`, after: \`Rp \${formPaid.toLocaleString('id-ID')}\` });
          } else if (formObj.resolutions?.capitalPaid && freshClient?.targetCapitalPaid === formPaid) {
            warningsList.push('Resolusi Peningkatan Modal dicentang, tapi nilai Modal Disetor tidak berubah.');
          }

          const newRevision: CompanyRevision = {
            revisionId: Math.random().toString(36).substring(7),
            changedAt: new Date().toISOString(),
            changedBy: currentUser?.name || currentUser?.email || 'Notaris Engine',
            projectCauseId: projectId,
            reason: isProjectMinuta(project.status) ? \`Koreksi Data Akta / Update Minuta (\${deedNumber.trim()})\` : \`Penetapan Akta Selesai (\${deedNumber.trim()})\`,
            changes: changesList.map(c => ({ field: c.category, before: c.before, after: c.after })),
            deedNumber: deedNumber.trim(),
            skNumber: firstSkSp ? firstSkSp.number : ''
          };
          const existingHistory = freshClient?.versionHistory || [];
          profileUpdate.versionHistory = [newRevision, ...existingHistory];
        }
      }

      // We have prepared everything. Now show the modal.
      const confirmSync = async () => {
        try {
          setIsSyncing(true);
          // Execute all DB writes
          await updateDoc(doc(db, 'office_projects', projectId), { metadata: updatedMetadata });
          if (refIdToUse && targetCollection && formUpdatePayload) {
            try {
              await updateDoc(doc(db, targetCollection, refIdToUse), cleanUndefined(formUpdatePayload));
            } catch (e) {
              console.warn('Could not update form document in Firestore collection:', e);
            }
          }
          if (project.clientId && profileUpdate) {
            await setDoc(doc(db, 'profiles', project.clientId), cleanUndefined(profileUpdate), { merge: true });
            try {
              await setDoc(doc(db, 'company_profiles', project.clientId), cleanUndefined(profileUpdate), { merge: true });
            } catch (e) {
              console.warn('Could not sync company_profiles:', e);
            }
          }
          setSyncPreviewState(null);
          resolve(syncedItems);
        } catch (e) {
          reject(e);
        } finally {
          setIsSyncing(false);
        }
      };

      setSyncPreviewState({
        show: true,
        changes: changesList,
        warnings: warningsList,
        onConfirm: confirmSync
      });
    });
  };
`;

const syncStart = content.indexOf('const syncDeedInfoAndClientProfile = async () => {');
const syncEnd = content.indexOf('const handleSaveDeedInfoOnly = async () => {');

if (syncStart !== -1 && syncEnd !== -1) {
  content = content.slice(0, syncStart) + replacement + content.slice(syncEnd);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced sync function');
} else {
  console.log('Could not find sync function bounds');
}
