import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProjectService } from '../../services/ProjectService';

interface AppBootstrapProps {
  activeProjectContext: string | null;
  setActiveProjectContext: (id: string | null) => void;
  setEditingRupstId: (id: string | null) => void;
  setEditingProjectId: (id: string | null) => void;
  setEditingPendirianId: (id: string | null) => void;
  setActiveProjectJobType: (jobType: string | null) => void;
  setPresetLoadedForProject: (id: string | null) => void;
}

export const AppBootstrap: React.FC<AppBootstrapProps> = ({
  activeProjectContext,
  setActiveProjectContext,
  setEditingRupstId,
  setEditingProjectId,
  setEditingPendirianId,
  setActiveProjectJobType,
  setPresetLoadedForProject
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. URL search params listener & navigator
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projId = params.get('projectId');
    const docId = params.get('id');
    
    if (projId || docId) {
      if (projId) {
        setActiveProjectContext(projId);
      }
      
      if (docId) {
        if (location.pathname === '/rupst') {
          setEditingRupstId(docId);
        } else if (location.pathname === '/rupslb') {
          setEditingProjectId(docId);
        } else if (location.pathname === '/pendirian') {
          setEditingPendirianId(docId);
        }
      } else {
        if (location.pathname === '/rupst') {
          setEditingRupstId('new');
        } else if (location.pathname === '/rupslb') {
          setEditingProjectId('new');
        } else if (location.pathname === '/pendirian') {
          setEditingPendirianId('new');
        }
      }
      
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, setActiveProjectContext, setEditingRupstId, setEditingProjectId, setEditingPendirianId]);

  // 2. Preset reset listener
  useEffect(() => {
    setPresetLoadedForProject(null);
  }, [activeProjectContext, setPresetLoadedForProject]);

  // 3. Active project job type fetcher
  useEffect(() => {
    if (activeProjectContext) {
      ProjectService.getProject(activeProjectContext)
        .then((proj) => {
          if (proj) {
            setActiveProjectJobType(proj.jobType);
          }
        })
        .catch((err) => {
          console.error("Error fetching active project details:", err);
        });
    } else {
      setActiveProjectJobType(null);
    }
  }, [activeProjectContext, setActiveProjectJobType]);

  return null;
};
