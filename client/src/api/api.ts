import axios from 'axios';
import { SpectroInfo } from '../components/geoJS/geoJSUtils';

export interface PaginatedResponse<E> {
    count: number,
    next: string,
    previous:string,
    results: E[];
}

export interface Recording {
    id: number,
    created: string,
    modified: string,
    name: string,
    audio_file: string,
    audio_file_presigned_url: string,
    owner_id: number;
    owner_username: string;
    recorded_date: string;
    recorded_time: string;
    equipment?: string,
    comments?: string;
    recording_location?: null | GeoJSON.Point,
    grts_cell_id?: null | number;
    grts_cell?: null | number;
    public: boolean;
    userMadeAnnotations: boolean;
    userAnnotations: number;
    hasSpectrogram: boolean;
    site_name?: string;
    software?: string;
    detector?: string;
    species_list?: string;
    unusual_occurrences?: string;
}

export interface AcousticFiles {
    id: number,
    recording_time: string;
    recording_location: string | null;
    file_name: string | null;
    s3_verified: boolean | null;
    length_ms: number | null;
    size_bytes: number | null;
    survey_event: null;
}

export interface Species {
    species_code: string;
    family: string;
    genus: string;
    common_name: string;
    species_code_6?: string;
    id: number;
}

export interface SpectrogramAnnotation {
    start_time: number;
    end_time: number;
    low_freq: number;
    high_freq: number;
    id: number;
    editing?: boolean;
    species?: Species[];
    comments?: string;
    type?: string;
    owner_email?: string;
}

export interface SpectrogramTemporalAnnotation {
    start_time: number;
    end_time: number;
    id: number;
    editing?: boolean;
    type?: string;
    comments?: string;
    species?: Species[];
    owner_email?: string;
}


export interface UpdateSpectrogramAnnotation {
    start_time?: number;
    end_time?: number;
    low_freq?: number;
    high_freq?: number;
    id?: number;
    editing?: boolean;
    type?: string;
    species?: Species[];
    comments?: string;
}

export interface UpdateSpectrogramTemporalAnnotation {
    start_time?: number;
    end_time?: number;
    id?: number;
    editing?: boolean;
    species?: Species[];
    comments?: string;
    type?: string;
}

export interface UserInfo {
    username: string;
    email: string;
    id: number;
}
export interface Spectrogram {
    url: string;
    filename?: string;
    annotations?: SpectrogramAnnotation[];
    temporal?: SpectrogramTemporalAnnotation[];
    spectroInfo?: SpectroInfo;
    currentUser?: string;
    otherUsers?: UserInfo[];

}

export type OtherUserAnnotations = Record<string, {annotations: SpectrogramAnnotation[], temporal: SpectrogramTemporalAnnotation[]}>;

interface PaginatedNinjaResponse<T> {
    count: number,
    items: T[],
}

export type UploadLocation =  null | { latitude?: number, longitude?: number, gridCellId?: number};

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VUE_APP_API_ROOT as string,
});

export interface RecordingFileParameters {
    name: string;
    recorded_date: string;
    recorded_time: string;
    equipment: string;
    comments: string;
    location?: UploadLocation;
    publicVal: boolean;
    site_name?: string;
    software?: string;
    detector?: string;
    species_list?: string;
    unusual_occurrences?: string;

}

async function uploadRecordingFile(file: File, params: RecordingFileParameters ) {
    const formData = new FormData();
    formData.append('audio_file', file);
    formData.append('name', params.name);
    formData.append('recorded_date', params.recorded_date);
    formData.append('recorded_time', params.recorded_time);
    formData.append('equipment', params.equipment);
    formData.append('comments', params.comments);
    if (params.location) {
        if (params.location.latitude && params.location.longitude) {
            formData.append('latitude', params.location.latitude.toString());
            formData.append('longitude', params.location.longitude.toString());
        }
        if (params.location.gridCellId) {
            formData.append('gridCellId', params.location.gridCellId.toString());
        }
    }
    
    if (params.software) {
        formData.append('software', params.software);
    }
    if (params.detector) {
        formData.append('detector', params.detector);
    }
    if (params.site_name) {
        formData.append('site_name', params.site_name);
    }
    if (params.species_list) {
        formData.append('species_list', params.species_list);
    }
    if (params.unusual_occurrences) {
        formData.append('unusual_occurrences', params.unusual_occurrences);
    }
    const recordingParams = {
      name: params.name,
      equipment: params.equipment,
      comments: params.comments,
      site_name: params.site_name,
      software: params.software,
      detector: params.detector,
      species_list: params.species_list,
      unusual_occurrences: params.unusual_occurrences
    };
    const payloadBlob = new Blob([JSON.stringify(recordingParams)], { type: 'application/json' });
    formData.append('payload', payloadBlob);
  await axiosInstance.post('/recording/',
    formData,
    { 
        params: { publicVal: !!params.publicVal }, 
        headers: {
            'Content-Type': 'multipart/form-data',   
        }
     });
  }

  async function patchRecording(recordingId: number, params: RecordingFileParameters) {
    const latitude = params.location ? params.location.latitude : undefined;
    const longitude = params.location ? params.location.longitude : undefined;
    const gridCellId = params.location ? params.location.gridCellId : undefined;

    await axiosInstance.patch(`/recording/${recordingId}`, 
        { 
            name: params.name, 
            recorded_date: params.recorded_date, 
            recorded_time: params.recorded_time, 
            equipment: params.equipment, 
            comments: params.comments, 
            publicVal: !!params.publicVal, 
            latitude,
            longitude,
            gridCellId,
            site_name: params.site_name,
            software: params.software,
            detector: params.detector,
            species_list: params.species_list,
            unusual_occurrences: params.unusual_occurrences,
        },
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
}

interface DeletionResponse {
    message?: string;
    error?: string;
}
interface GRTSCellCenter {
    latitude?: number;
    longitude?: number;
    error?: string;
}
  
async function getRecordings(getPublic=false) {
    return axiosInstance.get<Recording[]>(`/recording/?public=${getPublic}`);
}
async function getRecording(id: string) {
    return axiosInstance.get<Recording>(`/recording/${id}/`);
}

async function deleteRecording(id: number) {
    return axiosInstance.delete<DeletionResponse>(`/recording/${id}`);
}


async function getSpectrogram(id: string) {
    return axiosInstance.get<Spectrogram>(`/recording/${id}/spectrogram`);
}

async function getSpectrogramCompressed(id: string) {
    return axiosInstance.get<Spectrogram>(`/recording/${id}/spectrogram/compressed`);

}

async function getAnnotations(recordingId: string) {
    return axiosInstance.get<SpectrogramAnnotation[]>(`/recording/${recordingId}/annotations`);
}

async function getTemporalAnnotations(recordingId: string) {
    return axiosInstance.get<SpectrogramTemporalAnnotation[]>(`/recording/${recordingId}/temporal-annotations`);
}

async function getSpecies() {
    return axiosInstance.get<Species[]>('/species/');
}

async function patchAnnotation(recordingId: string, annotationId: number, annotation: UpdateSpectrogramAnnotation, speciesList: number[] | null = null) {
    return axiosInstance.patch(`/recording/${recordingId}/annotations/${annotationId}`, { annotation, species_ids: speciesList});
}

async function patchTemporalAnnotation(recordingId: string, annotationId: number, annotation: UpdateSpectrogramTemporalAnnotation, speciesList: number[] | null = null) {
    return axiosInstance.patch(`/recording/${recordingId}/temporal-annotations/${annotationId}`, { annotation, species_ids: speciesList});
}

async function putAnnotation(recordingId: string, annotation: UpdateSpectrogramAnnotation, speciesList: number[] = []) {
    return axiosInstance.put<{message: string, id: number}>(`/recording/${recordingId}/annotations`, { annotation, species_ids: speciesList});
}

async function putTemporalAnnotation(recordingId: string, annotation: UpdateSpectrogramTemporalAnnotation, speciesList: number[] | null = null) {
    return axiosInstance.put<{message: string, id: number}>(`/recording/${recordingId}/temporal-annotations`, { annotation, species_ids: speciesList});
}

async function deleteAnnotation(recordingId: string, annotationId: number) {
    return axiosInstance.delete<DeletionResponse>(`/recording/${recordingId}/annotations/${annotationId}`);
}

async function deleteTemporalAnnotation(recordingId: string, annotationId: number) {
    return axiosInstance.delete<DeletionResponse>(`/recording/${recordingId}/temporal-annotations/${annotationId}`);
}

async function getOtherUserAnnotations(recordingId: string) {
    return axiosInstance.get<OtherUserAnnotations>(`/recording/${recordingId}/annotations/other_users`);
}

async function getCellLocation(cellId: number, quadrant?: 'SW' | 'NE' | 'NW' | 'SE') {
    return axiosInstance.get<GRTSCellCenter>(`/grts/${cellId}`, { params: { quadrant }});
}

interface CellIDReponse {
    grid_cell_id?: number;
    error?: string,
}
async function getCellfromLocation(latitude: number, longitude: number) {
    return axiosInstance.get<CellIDReponse>(`/grts/grid_cell_id`, {params: {latitude, longitude}});
}

interface GuanoMetadata {
    nabat_grid_cell_grts_id?: string
    nabat_latitude?: number
    nabat_longitude?: number
    nabat_site_name?: string
    nabat_activation_start_time?: string
    nabat_activation_end_time?: string
    nabat_software_type?: string
    nabat_species_list?: string[]
    nabat_comments?: string
    nabat_detector_type?: string
    nabat_unusual_occurrences?: string

}

async function getGuanoMetadata(file: File): Promise<GuanoMetadata> {
    const formData = new FormData();
    formData.append('audio_file', file);
    const results = await axiosInstance.post<GuanoMetadata>('/guano/',formData, {
        headers: {
            'Content-Type': 'multipart/form-data',   
        }
    });
    return results.data;

}

export {
 uploadRecordingFile,
 getRecordings,
 getRecording,
 patchRecording,
 deleteRecording,
 getSpectrogram,
 getSpectrogramCompressed,
 getTemporalAnnotations,
 getOtherUserAnnotations,
 getSpecies,
 getAnnotations,
 patchAnnotation,
 patchTemporalAnnotation,
 putAnnotation,
 putTemporalAnnotation,
 deleteAnnotation,
 deleteTemporalAnnotation,
 getCellLocation,
 getCellfromLocation,
 getGuanoMetadata,
};