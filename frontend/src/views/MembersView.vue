<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useMemberStore } from '../stores/member.store';
import { useAuthStore } from '../stores/auth.store';
import { useSyncStore } from '../stores/sync.store';
import { useBiometricStore } from '../stores/biometric.store';
import { downloadPaymentReceipt } from '../utils/pdf-receipt';

import { useRoute } from 'vue-router';
const memberStore = useMemberStore();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const biometricStore = useBiometricStore();
const route = useRoute();

function formatDateDDMMYYYY(dateInput: any): string {
  if (!dateInput) return 'N/A';
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTimeDDMMYYYY(dateInput: any): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Estados de carga
const isLoading = ref(false);
const isDetailLoading = ref(false);

const searchQuery = ref('');
const isSubmitting = ref(false);
const activeTab = ref<'overview' | 'memberships' | 'payments' | 'activity' | 'documents' | 'biometrics'>('overview');

// Document upload states
const documentSummary = ref('');
const selectedPdfFile = ref<File | null>(null);
const docErrorMsg = ref('');
const isUploadingDoc = ref(false);

function onPdfFileChange(e: any) {
  const file = e.target.files[0];
  docErrorMsg.value = '';
  if (file) {
    if (file.type !== 'application/pdf') {
      docErrorMsg.value = 'Solo se admiten archivos PDF.';
      selectedPdfFile.value = null;
      return;
    }
    selectedPdfFile.value = file;
  }
}

async function handleUploadDocument() {
  if (!selectedPdfFile.value || !documentSummary.value.trim() || !memberStore.selectedMember) return;
  isUploadingDoc.value = true;
  docErrorMsg.value = '';
  
  try {
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const base64Data = event.target.result;
      const success = await memberStore.uploadMemberDocument(
        memberStore.selectedMember.id, 
        documentSummary.value, 
        base64Data
      );
      if (success) {
        documentSummary.value = '';
        selectedPdfFile.value = null;
        triggerToast('Documento guardado con éxito.');
      } else {
        docErrorMsg.value = 'Error al subir el documento.';
      }
      isUploadingDoc.value = false;
    };
    reader.readAsDataURL(selectedPdfFile.value);
  } catch (err: any) {
    console.error(err);
    docErrorMsg.value = 'Ocurrió un error inesperado.';
    isUploadingDoc.value = false;
  }
}

async function handleDeleteDocument(docId: string) {
  if (!memberStore.selectedMember) return;
  if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
    const success = await memberStore.deleteMemberDocument(memberStore.selectedMember.id, docId);
    if (success) {
      triggerToast('Documento eliminado con éxito.');
    } else {
      triggerToast('Error al eliminar el documento.');
    }
  }
}

function downloadDocument(doc: any) {
  const linkSource = doc.fileData;
  const downloadLink = document.createElement("a");
  const fileName = `${doc.summary}.pdf`;
  downloadLink.href = linkSource;
  downloadLink.download = fileName;
  downloadLink.click();
}

// Member Registration Modal States
const showAddMemberModal = ref(false);
const fileInputRef = ref<any>(null);
const videoRef = ref<any>(null);
const cameraActive = ref(false);
const capturedPhoto = ref<string | null>(null);
let mediaStream: MediaStream | null = null;

const memberForm = ref({
  firstName: '',
  lastName: '',
  gender: 'Masculino',
  birthDate: '',
  email: '',
  phone: '',
  street: '',
  number: '',
  city: '',
  state: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  notes: '',
  photoUrl: '',
  noPaymentRequired: false,
});

function triggerFileSelect() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function onFileChange(event: any) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      memberForm.value.photoUrl = e.target.result;
      capturedPhoto.value = null;
    };
    reader.readAsDataURL(file);
  }
}

async function startCamera() {
  try {
    cameraActive.value = true;
    capturedPhoto.value = null;
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
    }
  } catch (err) {
    console.error('Error accessing camera', err);
    alert('No se pudo acceder a la cámara');
    cameraActive.value = false;
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  cameraActive.value = false;
}

function captureSnapshot() {
  if (videoRef.value) {
    const video = videoRef.value;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      capturedPhoto.value = dataUrl;
      memberForm.value.photoUrl = dataUrl;
    }
    stopCamera();
  }
}

watch(showAddMemberModal, (newVal) => {
  if (!newVal) {
    stopCamera();
  }
});

function validateMemberForm(form: any): string | null {
  if (!form.firstName?.trim()) return 'El nombre es obligatorio.';
  if (!form.lastName?.trim()) return 'El apellido es obligatorio.';
  if (!form.birthDate) return 'La fecha de nacimiento es obligatoria.';
  
  if (!form.phone) {
    return 'El teléfono es obligatorio.';
  } else {
    const cleanPhone = form.phone.replace(/[\s-()]/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      return 'El teléfono debe tener exactamente 10 dígitos numéricos.';
    }
  }

  if (form.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return 'El correo electrónico no tiene un formato válido.';
    }
  }

  if (form.postalCode) {
    const cpRegex = /^\d{5}$/;
    if (!cpRegex.test(form.postalCode)) {
      return 'El código postal debe tener exactamente 5 dígitos.';
    }
  }

  if (form.emergencyContactPhone) {
    const cleanEmergencyPhone = form.emergencyContactPhone.replace(/[\s-()]/g, '');
    if (!/^\d{10}$/.test(cleanEmergencyPhone)) {
      return 'El teléfono de contacto de emergencia debe tener exactamente 10 dígitos numéricos.';
    }
  }

  return null;
}

async function saveNewMember() {
  if (isSubmitting.value) return;
  const errorMsg = validateMemberForm(memberForm.value);
  if (errorMsg) {
    triggerToast(errorMsg);
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      ...memberForm.value,
      notes: memberForm.value.notes ? [memberForm.value.notes] : [],
    };

    const created = await memberStore.createMember(payload);
    if (created) {
      showAddMemberModal.value = false;
      memberForm.value = {
        firstName: '',
        lastName: '',
        gender: 'Masculino',
        birthDate: '',
        email: '',
        phone: '',
        street: '',
        number: '',
        city: '',
        state: '',
        postalCode: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        notes: '',
        photoUrl: '',
        noPaymentRequired: false,
      };
      capturedPhoto.value = null;
      triggerToast('Miembro registrado correctamente');
      await memberStore.fetchMembers();
    } else {
      triggerToast('Error al registrar miembro');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

const filterPlan = ref('ALL');
const filterStatus = ref('ALL');
const sortBy = ref('MEMBER_NUMBER_ASC');

const filteredMembers = computed(() => {
  let list = memberStore.members.filter((m: any) => {
    // 1. Filtro de búsqueda (local e instantánea)
    const q = searchQuery.value.toLowerCase().trim();
    if (q) {
      const firstName = (m.firstName || '').toLowerCase();
      const lastName = (m.lastName || '').toLowerCase();
      const memberNumber = (m.memberNumber || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      
      if (!firstName.includes(q) &&
          !lastName.includes(q) &&
          !memberNumber.includes(q) &&
          !phone.includes(q) &&
          !email.includes(q)) {
        return false;
      }
    }
    // 2. Filtro de plan
    if (filterPlan.value !== 'ALL') {
      if (filterPlan.value === 'NONE') {
        if (m.hasActiveMembership) return false;
      } else {
        if (m.activePlanId !== filterPlan.value) return false;
      }
    }
    // 3. Filtro de estatus
    if (filterStatus.value !== 'ALL') {
      if (filterStatus.value === 'ACTIVE') {
        if (m.isActive === false) return false;
      } else if (filterStatus.value === 'INACTIVE') {
        if (m.isActive !== false) return false;
      } else if (filterStatus.value === 'EXPIRED') {
        if (m.isActive === false || m.hasActiveMembership === true) return false;
      }
    }
    return true;
  });

  // Precalculate expiration dates to avoid nested lookups during sort comparisons
  const expirationCache = new Map<string, string>();
  if (sortBy.value === 'EXPIRATION_DATE_ASC' || sortBy.value === 'EXPIRATION_DATE_DESC') {
    for (const m of list) {
      const ms = memberStore.activeMemberships.find((x: any) => x.memberId === m.id && x.status === 'ACTIVE');
      if (ms) {
        expirationCache.set(m.id, ms.endDate);
      } else {
        const lastMs = [...memberStore.activeMemberships]
          .filter((x: any) => x.memberId === m.id)
          .sort((x: any, y: any) => y.endDate.localeCompare(x.endDate))[0];
        expirationCache.set(m.id, lastMs ? lastMs.endDate : '9999-12-31');
      }
    }
  }

  // Sort list
  list = [...list].sort((a: any, b: any) => {
    if (sortBy.value === 'ALPHABETICAL_ASC') {
      return a.lastName.localeCompare(b.lastName);
    }
    if (sortBy.value === 'ALPHABETICAL_DESC') {
      return b.lastName.localeCompare(a.lastName);
    }
    if (sortBy.value === 'MEMBER_NUMBER_ASC') {
      const numA = parseInt(a.memberNumber.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.memberNumber.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    }
    if (sortBy.value === 'MEMBER_NUMBER_DESC') {
      const numA = parseInt(a.memberNumber.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.memberNumber.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    }
    if (sortBy.value === 'EXPIRATION_DATE_ASC' || sortBy.value === 'EXPIRATION_DATE_DESC') {
      const dateA = expirationCache.get(a.id) || '9999-12-31';
      const dateB = expirationCache.get(b.id) || '9999-12-31';
      
      if (sortBy.value === 'EXPIRATION_DATE_ASC') {
        return dateA.localeCompare(dateB);
      } else {
        if (dateA === '9999-12-31') return 1;
        if (dateB === '9999-12-31') return -1;
        return dateB.localeCompare(dateA);
      }
    }
    return 0;
  });

  return list;
});

onMounted(async () => {
  if (route.query.status) {
    filterStatus.value = route.query.status as string;
  }
  if (route.query.sort) {
    sortBy.value = route.query.sort as string;
  }

  isLoading.value = true;
  await Promise.all([
    memberStore.fetchMembers(),
    memberStore.fetchPlans(),
    biometricStore.fetchLogs()
  ]);
  isLoading.value = false;

  // Auto-seleccionar primer miembro o el seleccionado en la redirección
  if (route.query.selectMemberId) {
    selectMember(route.query.selectMemberId as string);
  } else if (memberStore.members.length > 0 && !memberStore.selectedMember) {
    selectMember(memberStore.members[0].id);
  }
});

// Watcher con debounce para sincronizar la búsqueda en el servidor en segundo plano
let searchTimeout: any = null;
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    await memberStore.fetchMembers(newVal);
  }, 350);
});

async function selectMember(id: string) {
  isDetailLoading.value = true;
  await memberStore.fetchMemberDetail(id);
  await biometricStore.fetchMemberLogs(id);
  await biometricStore.fetchMemberFingerprints(id);
  activeTab.value = 'overview';
  isDetailLoading.value = false;
}

const noteText = ref('');
const showNoteInput = ref(false);

function toggleAddNote() {
  showNoteInput.value = !showNoteInput.value;
  if (showNoteInput.value) {
    noteText.value = '';
  }
}

async function saveNote() {
  if (!noteText.value || !memberStore.selectedMember) return;
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/members/${memberStore.selectedMember.id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ note: noteText.value })
  });
  if (res.ok) {
    syncStore.registerModification('CREACION_NOTA', `Nota agregada para miembro: ${memberStore.selectedMember.firstName} ${memberStore.selectedMember.lastName}`);
    noteText.value = '';
    showNoteInput.value = false;
    memberStore.fetchMemberDetail(memberStore.selectedMember.id);
    triggerToast('Observación agregada correctamente.');
  } else {
    triggerToast('Error al agregar observación.');
  }
}

// Estado del modal de suspensión
const showDeactivateModal = ref(false);
const isDeactivating = ref(false);
const confirmBtnRef = ref<HTMLElement | null>(null);
const cancelBtnRef = ref<HTMLElement | null>(null);

// Estado de notificaciones (Toast)
const toastMessage = ref('');
const showToast = ref(false);

function triggerToast(message: string) {
  toastMessage.value = message;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function openDeactivateModal() {
  showDeactivateModal.value = true;
}

function closeDeactivateModal() {
  showDeactivateModal.value = false;
}

watch(showDeactivateModal, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleModalKeys);
    setTimeout(() => {
      cancelBtnRef.value?.focus();
    }, 50);
  } else {
    window.removeEventListener('keydown', handleModalKeys);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleModalKeys);
});

function handleModalKeys(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeDeactivateModal();
  }
  if (e.key === 'Tab') {
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      if (activeEl === cancelBtnRef.value) {
        confirmBtnRef.value?.focus();
        e.preventDefault();
      }
    } else {
      if (activeEl === confirmBtnRef.value) {
        cancelBtnRef.value?.focus();
        e.preventDefault();
      }
    }
  }
}

function triggerDeactivate() {
  if (!memberStore.selectedMember) return;
  openDeactivateModal();
}

async function confirmDeactivate() {
  if (!memberStore.selectedMember) return;
  isDeactivating.value = true;
  try {
    const success = await memberStore.deactivateMember(memberStore.selectedMember.id);
    if (success) {
      triggerToast(`Miembro suspendido correctamente.`);
      closeDeactivateModal();
      if (memberStore.members.length > 0) {
        selectMember(memberStore.members[0].id);
      }
    } else {
      triggerToast('Error al suspender el miembro.');
    }
  } catch (error) {
    console.error(error);
    triggerToast('Ocurrió un error inesperado.');
  } finally {
    isDeactivating.value = false;
  }
}

async function handleReactivate() {
  if (!memberStore.selectedMember) return;
  const success = await memberStore.reactivateMember(memberStore.selectedMember.id);
  if (success) {
    triggerToast('Miembro reactivado correctamente.');
  } else {
    triggerToast('Error al reactivar el miembro.');
  }
}

function getMemberAvatarUrl(member: any): string {
  if (member?.photoUrl) return member.photoUrl;
  const gender = String(member?.gender || '').toLowerCase();
  if (gender.startsWith('f')) {
    return '/woman_placeholder.png';
  } else if (gender.startsWith('m')) {
    return '/man_placeholder.png';
  } else {
    return '/other_placeholder.png';
  }
}

async function downloadReceipt(payment: any) {
  if (!memberStore.selectedMember) return;
  const membership = memberStore.activeMemberships.find((m: any) => m.id === payment.membershipId);
  if (membership && membership.status === 'PENDING') {
    triggerToast('No se puede generar el recibo hasta que el saldo esté completamente liquidado.');
    return;
  }
  const plan = membership ? memberStore.plans.find((p: any) => p.id === membership.planId) : null;
  const planName = plan ? plan.name : 'Plan de Membresía';
  
  await downloadPaymentReceipt(payment, memberStore.selectedMember, planName, payment.beneficiaries);
}

// Modal de edición de membresía (Solo dueños)
const showEditMembershipModal = ref(false);
const editingMembership = ref<any>(null);
const membershipForm = ref({
  planId: '',
  startDate: '',
  endDate: '',
  status: 'PENDING' as 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED',
});

function openEditMembership(ms: any) {
  editingMembership.value = ms;
  membershipForm.value = {
    planId: ms.planId,
    startDate: ms.startDate,
    endDate: ms.endDate,
    status: ms.status,
  };
  showEditMembershipModal.value = true;
}

async function handleSaveMembership() {
  if (!editingMembership.value || !memberStore.selectedMember || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const success = await memberStore.updateMembership(editingMembership.value.id, membershipForm.value);
    if (success) {
      showEditMembershipModal.value = false;
      editingMembership.value = null;
      memberStore.fetchMemberDetail(memberStore.selectedMember.id);
      triggerToast('Historial de membresía actualizado.');
    } else {
      triggerToast('Error al actualizar la membresía.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

// Modal de edición de perfil
const showEditMemberModal = ref(false);
const editMemberForm = ref({
  firstName: '',
  lastName: '',
  gender: 'Masculino',
  birthDate: '',
  email: '',
  phone: '',
  street: '',
  number: '',
  city: '',
  state: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  photoUrl: '',
  noPaymentRequired: false,
});

const fileEditInputRef = ref<any>(null);
const videoEditRef = ref<any>(null);
const cameraEditActive = ref(false);
const capturedEditPhoto = ref<string | null>(null);
let mediaEditStream: MediaStream | null = null;

function triggerEditFileSelect() {
  if (fileEditInputRef.value) {
    fileEditInputRef.value.click();
  }
}

function onEditFileChange(event: any) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      editMemberForm.value.photoUrl = e.target.result;
      capturedEditPhoto.value = null;
    };
    reader.readAsDataURL(file);
  }
}

async function startEditCamera() {
  try {
    cameraEditActive.value = true;
    capturedEditPhoto.value = null;
    mediaEditStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    if (videoEditRef.value) {
      videoEditRef.value.srcObject = mediaEditStream;
    }
  } catch (err) {
    console.error('Error accessing camera', err);
    alert('No se pudo acceder a la cámara');
    cameraEditActive.value = false;
  }
}

function stopEditCamera() {
  if (mediaEditStream) {
    mediaEditStream.getTracks().forEach((track) => track.stop());
  }
  cameraEditActive.value = false;
}

function captureEditSnapshot() {
  if (videoEditRef.value) {
    const video = videoEditRef.value;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      capturedEditPhoto.value = dataUrl;
      editMemberForm.value.photoUrl = dataUrl;
    }
    stopEditCamera();
  }
}

function removeEditPhoto() {
  editMemberForm.value.photoUrl = '';
  capturedEditPhoto.value = null;
  stopEditCamera();
}

function openEditMemberModal() {
  if (!memberStore.selectedMember) return;
  const m = memberStore.selectedMember;
  editMemberForm.value = {
    firstName: m.firstName,
    lastName: m.lastName,
    gender: m.gender || 'Masculino',
    birthDate: m.birthDate || '',
    email: m.email || '',
    phone: m.phone || '',
    street: m.street || '',
    number: m.number || '',
    city: m.city || '',
    state: m.state || '',
    postalCode: m.postalCode || '',
    emergencyContactName: m.emergencyContactName || '',
    emergencyContactPhone: m.emergencyContactPhone || '',
    emergencyContactRelationship: m.emergencyContactRelationship || '',
    photoUrl: m.photoUrl || '',
    noPaymentRequired: m.noPaymentRequired || false,
  };
  capturedEditPhoto.value = null;
  cameraEditActive.value = false;
  showEditMemberModal.value = true;
}

async function handleSaveMember() {
  if (!memberStore.selectedMember || isSubmitting.value) return;
  const errorMsg = validateMemberForm(editMemberForm.value);
  if (errorMsg) {
    triggerToast(errorMsg);
    return;
  }
  isSubmitting.value = true;
  try {
    const success = await memberStore.updateMember(memberStore.selectedMember.id, editMemberForm.value);
    if (success) {
      showEditMemberModal.value = false;
      triggerToast('Datos de perfil actualizados correctamente.');
    } else {
      triggerToast('Error al actualizar datos de perfil.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

// Modal de asignación/renovación de plan
const showRenewPlanModal = ref(false);
// Pestaña Biométrica
const showEnrollModal = ref(false);
const enrollFingerIndex = ref(1); // Dedos estándar
const enrollStep = ref<'waiting_agent' | 'ready' | 'step_1' | 'step_2' | 'step_3' | 'success' | 'error'>('waiting_agent');
const enrollErrorMsg = ref('');
const isSimulatedEnroll = ref(false);

let enrollWS: WebSocket | null = null;

const leftHandFingers = [
  { index: 4, name: 'Pulgar Izquierdo' },
  { index: 3, name: 'Índice Izquierdo' },
  { index: 2, name: 'Medio Izquierdo' },
  { index: 1, name: 'Anular Izquierdo' },
  { index: 0, name: 'Meñique Izquierdo' }
];

const rightHandFingers = [
  { index: 5, name: 'Pulgar Derecho' },
  { index: 6, name: 'Índice Derecho' },
  { index: 7, name: 'Medio Derecho' },
  { index: 8, name: 'Anular Derecho' },
  { index: 9, name: 'Meñique Derecho' }
];

const fingerNames: Record<number, string> = {
  0: 'Meñique Izquierdo',
  1: 'Anular Izquierdo',
  2: 'Medio Izquierdo',
  3: 'Índice Izquierdo',
  4: 'Pulgar Izquierdo',
  5: 'Pulgar Derecho',
  6: 'Índice Derecho',
  7: 'Medio Derecho',
  8: 'Anular Derecho',
  9: 'Meñique Derecho'
};

function isFingerEnrolled(idx: number) {
  return biometricStore.enrolledFingerprints.some((f: any) => f.fingerIndex === idx);
}

function getFingerEnrollmentDate(idx: number) {
  const fp = biometricStore.enrolledFingerprints.find((f: any) => f.fingerIndex === idx);
  return fp ? formatDateDDMMYYYY(fp.createdAt) : '';
}

function openEnrollFinger(idx: number) {
  enrollFingerIndex.value = idx;
  enrollStep.value = 'waiting_agent';
  enrollErrorMsg.value = '';
  showEnrollModal.value = true;
  isSimulatedEnroll.value = false;
  
  connectToEnrollAgent();
}

function connectToEnrollAgent() {
  if (enrollWS) {
    enrollWS.close();
  }

  const wsHost = window.location.hostname || 'localhost';
  enrollWS = new WebSocket(`ws://${wsHost}:9000`);

  enrollWS.onopen = () => {
    enrollStep.value = 'ready';
    enrollWS?.send(JSON.stringify({ 
      action: 'enroll', 
      memberId: memberStore.selectedMember?.id, 
      fingerIndex: enrollFingerIndex.value 
    }));
  };

  enrollWS.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.status === 'scanning') {
        if (data.count === 1) enrollStep.value = 'step_1';
        if (data.count === 2) enrollStep.value = 'step_2';
        if (data.count === 3) enrollStep.value = 'step_3';
      } else if (data.status === 'success') {
        enrollStep.value = 'success';
        if (memberStore.selectedMember) {
          const ok = await biometricStore.saveFingerprint(
            memberStore.selectedMember.id, 
            enrollFingerIndex.value, 
            data.template
          );
          if (ok) {
            triggerToast('Huella registrada correctamente.');
            if (enrollWS && enrollWS.readyState === WebSocket.OPEN) {
              enrollWS.send(JSON.stringify({ action: 'sync' }));
            }
            biometricStore.sendSyncToAgent();
            setTimeout(() => {
              closeEnrollWS();
            }, 600);
          } else {
            enrollStep.value = 'error';
            enrollErrorMsg.value = 'No se pudo guardar la huella en el servidor.';
            closeEnrollWS();
          }
        }
      } else if (data.status === 'error') {
        enrollStep.value = 'error';
        enrollErrorMsg.value = data.message || 'Error durante el escaneo.';
        closeEnrollWS();
      }
    } catch (e) {
      console.error('Error parsing agent message', e);
    }
  };

  enrollWS.onerror = () => {
    // Si falla el lector local, queda en 'waiting_agent' para que puedan probar vía simulación
  };

  enrollWS.onclose = () => {
    enrollWS = null;
  };
}

function closeEnrollWS() {
  if (enrollWS) {
    enrollWS.close();
    enrollWS = null;
  }
}

function closeEnrollModal() {
  closeEnrollWS();
  showEnrollModal.value = false;
}

async function triggerSimulatedEnrollment() {
  if (!memberStore.selectedMember) return;
  isSimulatedEnroll.value = true;
  enrollStep.value = 'step_1';
  await new Promise((resolve) => setTimeout(resolve, 800));
  enrollStep.value = 'step_2';
  await new Promise((resolve) => setTimeout(resolve, 800));
  enrollStep.value = 'step_3';
  await new Promise((resolve) => setTimeout(resolve, 800));
  enrollStep.value = 'success';
  
  const dummyTemplate = 'ZKTECO_DUMMY_TEMPLATE_' + Math.random().toString(36).substring(2);
  const ok = await biometricStore.saveFingerprint(
    memberStore.selectedMember.id, 
    enrollFingerIndex.value, 
    dummyTemplate
  );
  if (ok) {
    triggerToast('Huella simulada guardada correctamente.');
  } else {
    enrollStep.value = 'error';
    enrollErrorMsg.value = 'Error al guardar la huella simulada.';
  }
}

async function deleteFingerprint(idx: number) {
  if (!memberStore.selectedMember) return;
  if (confirm(`¿Está seguro de eliminar la huella del dedo: ${fingerNames[idx]}?`)) {
    const ok = await biometricStore.deleteFingerprint(memberStore.selectedMember.id, idx);
    if (ok) {
      triggerToast('Huella eliminada correctamente.');
    } else {
      triggerToast('Error al eliminar la huella.');
    }
  }
}

// Modal de registrar pago
const showRegisterPaymentModal = ref(false);
const paymentForm = ref({
  membershipId: '',
  paymentMethodId: '90000000-0000-0000-0000-000000000001',
  amount: 0,
  discount: 0,
  referenceNumber: '',
});

const mixedPaymentEfectivo = ref(0);
const mixedPaymentTarjeta = ref(0);
const mixedPaymentTransferencia = ref(0);

function updateMixedTotal() {
  paymentForm.value.amount = (mixedPaymentEfectivo.value || 0) + (mixedPaymentTarjeta.value || 0) + (mixedPaymentTransferencia.value || 0);
}

const memberPendingMemberships = computed(() => {
  return memberStore.activeMemberships.filter((m: any) => m.status === 'PENDING');
});

function openRegisterPaymentModal() {
  paymentForm.value = {
    membershipId: '',
    paymentMethodId: '90000000-0000-0000-0000-000000000001',
    amount: 0,
    discount: 0,
    referenceNumber: '',
  };
  mixedPaymentEfectivo.value = 0;
  mixedPaymentTarjeta.value = 0;
  mixedPaymentTransferencia.value = 0;
  if (memberPendingMemberships.value.length > 0) {
    const selected = memberPendingMemberships.value[0];
    paymentForm.value.membershipId = selected.id;
    if (selected.remainingBalance !== undefined) {
      paymentForm.value.amount = selected.remainingBalance / 100;
    } else {
      const plan = memberStore.plans.find((p: any) => p.id === selected.planId);
      if (plan) {
        paymentForm.value.amount = plan.price / 100;
      }
    }
  }
  showRegisterPaymentModal.value = true;
}

function onPaymentPlanChange() {
  paymentForm.value.discount = 0;
  const selectedMs = memberPendingMemberships.value.find((m: any) => m.id === paymentForm.value.membershipId);
  if (selectedMs) {
    if (selectedMs.remainingBalance !== undefined) {
      paymentForm.value.amount = selectedMs.remainingBalance / 100;
    } else {
      const plan = memberStore.plans.find((p: any) => p.id === selectedMs.planId);
      if (plan) {
        paymentForm.value.amount = plan.price / 100;
      }
    }
  }
}

function onDiscountChange() {
  const selectedMs = memberPendingMemberships.value.find((m: any) => m.id === paymentForm.value.membershipId);
  if (selectedMs) {
    const basePrice = selectedMs.remainingBalance !== undefined ? selectedMs.remainingBalance / 100 : getPlanPriceForSelected();
    if (paymentForm.value.discount > basePrice) {
      paymentForm.value.discount = basePrice;
    }
    if (paymentForm.value.discount < 0) {
      paymentForm.value.discount = 0;
    }
    paymentForm.value.amount = basePrice - paymentForm.value.discount;
  }
}

function getPlanPriceForSelected() {
  const selectedMs = memberPendingMemberships.value.find((m: any) => m.id === paymentForm.value.membershipId);
  const plan = selectedMs ? memberStore.plans.find((p: any) => p.id === selectedMs.planId) : null;
  return plan ? plan.price / 100 : 0;
}

async function handleRegisterPayment() {
  if (!memberStore.selectedMember || isSubmitting.value) return;
  if (!paymentForm.value.membershipId) {
    triggerToast('Debe seleccionar una membresía pendiente.');
    return;
  }
  
  isSubmitting.value = true;
  try {
    let finalRef = paymentForm.value.referenceNumber;
    if (paymentForm.value.paymentMethodId === '90000000-0000-0000-0000-000000000005') {
      const parts = [];
      if (mixedPaymentEfectivo.value > 0) parts.push(`Ef: $${mixedPaymentEfectivo.value}`);
      if (mixedPaymentTarjeta.value > 0) parts.push(`Tarj: $${mixedPaymentTarjeta.value}`);
      if (mixedPaymentTransferencia.value > 0) parts.push(`Transf: $${mixedPaymentTransferencia.value}`);
      const details = parts.join(' + ');
      finalRef = finalRef ? `${details} | Ref: ${finalRef}` : details;
    }

    const payload = {
      memberId: memberStore.selectedMember.id,
      membershipId: paymentForm.value.membershipId,
      paymentMethodId: paymentForm.value.paymentMethodId,
      amount: paymentForm.value.amount * 100, // a centavos
      discount: (paymentForm.value.discount || 0) * 100, // a centavos
      referenceNumber: finalRef,
    };

    const created = await memberStore.registerPayment(payload);
    if (created) {
      showRegisterPaymentModal.value = false;
      triggerToast('Pago registrado correctamente.');
      await memberStore.fetchMemberDetail(memberStore.selectedMember.id);
      
      // Auto download receipt only if fully paid
      if (created.isFullyPaid) {
        try {
          const selectedMs = memberStore.activeMemberships.find((m: any) => m.id === payload.membershipId);
          const plan = selectedMs ? memberStore.plans.find((p: any) => p.id === selectedMs.planId) : null;
          const planName = plan ? plan.name : 'Plan de Membresía';
          await downloadPaymentReceipt(created, memberStore.selectedMember, planName, created.beneficiaries);
        } catch (e) {
          console.error('Error generating PDF receipt', e);
        }
      }
    } else {
      triggerToast('Error al registrar el pago.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

const renewPlanForm = ref({
  planId: '',
  startDate: '',
  beneficiaryIds: [] as string[],
});

const selectedPlanDetails = computed(() => {
  return memberStore.plans.find((p: any) => p.id === renewPlanForm.value.planId);
});

const numBeneficiariesNeeded = computed(() => {
  if (!selectedPlanDetails.value?.isGroup) return 0;
  return (selectedPlanDetails.value.maxMembers || 2) - 1;
});

function getLastMembership() {
  if (!memberStore.activeMemberships || memberStore.activeMemberships.length === 0) return null;
  const membershipsCopy = [...memberStore.activeMemberships];
  membershipsCopy.sort((a: any, b: any) => {
    return b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate);
  });
  return membershipsCopy[0];
}

const eligibleBeneficiaries = computed(() => {
  if (!memberStore.selectedMember) return [];
  return memberStore.members.filter((m: any) => {
    let mainId = memberStore.selectedMember.id;
    const lastMs = getLastMembership();
    const plan = memberStore.plans.find((p: any) => p.id === renewPlanForm.value.planId);
    if (lastMs && lastMs.groupParentMemberId && plan?.isGroup) {
      mainId = lastMs.groupParentMemberId;
    }

    if (m.id === mainId) return false;
    if (renewPlanForm.value.beneficiaryIds.includes(m.id)) return true;
    if (m.isActive === false) return false;
    
    const mMemberships = memberStore.activeMemberships.filter((ms: any) => ms.memberId === m.id);
    if (mMemberships.length === 0) return true; // Without plan
    
    const latestMs = [...mMemberships].sort((a: any, b: any) => b.endDate.localeCompare(a.endDate))[0];
    return latestMs.status === 'EXPIRED' || latestMs.status === 'CANCELLED';
  });
});

function openRenewPlanModal() {
  if (!memberStore.selectedMember) return;
  
  const lastMembership = getLastMembership();
  if (lastMembership) {
    renewPlanForm.value.planId = lastMembership.planId;
    renewPlanForm.value.beneficiaryIds = lastMembership.beneficiaryIds ? [...lastMembership.beneficiaryIds] : [];
  } else {
    renewPlanForm.value.planId = memberStore.plans[0]?.id || '';
    renewPlanForm.value.beneficiaryIds = [];
  }
  
  renewPlanForm.value.startDate = '';
  showRenewPlanModal.value = true;
}

async function handleRenewPlan() {
  if (!memberStore.selectedMember || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const additionalIds = renewPlanForm.value.beneficiaryIds.filter(id => !!id);
    
    let mainMemberId = memberStore.selectedMember.id;
    let finalBeneficiaryIds = [...additionalIds];
    
    const lastMembership = getLastMembership();
    if (lastMembership && lastMembership.groupParentMemberId) {
      const plan = memberStore.plans.find((p: any) => p.id === renewPlanForm.value.planId);
      if (plan && plan.isGroup) {
        mainMemberId = lastMembership.groupParentMemberId;
        finalBeneficiaryIds = finalBeneficiaryIds.filter(id => id !== mainMemberId);
      }
    }
    
    const success = await memberStore.assignMembership(
      mainMemberId, 
      renewPlanForm.value.planId,
      renewPlanForm.value.startDate || undefined,
      finalBeneficiaryIds
    );
    if (success) {
      showRenewPlanModal.value = false;
      renewPlanForm.value.startDate = '';
      renewPlanForm.value.beneficiaryIds = [];
      triggerToast('Membresía asignada/renovada correctamente.');
      await memberStore.fetchMemberDetail(memberStore.selectedMember.id);
    } else {
      triggerToast('Error al asignar/renovar membresía.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

function countDaysExcludingSundays(fromStr: string, toStr: string): number {
  const start = new Date(fromStr);
  const end = new Date(toStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (end < start) return 0;
  
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() !== 0) { // 0 is Sunday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Métricas de membresía computadas
const membershipProgress = computed(() => {
  const activeMs = memberStore.activeMemberships.find(m => m.status === 'ACTIVE');
  if (!activeMs) return null;
  
  const plan = memberStore.plans.find((p: any) => p.id === activeMs.planId);
  const totalDays = plan ? plan.durationDays : 30;
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const start = new Date(activeMs.startDate + 'T00:00:00');
  const end = new Date(todayStr + 'T00:00:00');
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const finalDaysPassed = Math.min(totalDays, daysPassed);
  
  const percentage = Math.min(100, Math.max(0, Math.round((finalDaysPassed / totalDays) * 100)));
  
  return {
    planName: activeMs.planName,
    endDate: formatDateDDMMYYYY(activeMs.endDate),
    totalDays,
    daysPassed: finalDaysPassed,
    percentage,
  };
});

const paymentSummary = computed(() => {
  const paidPayments = memberStore.activePayments.filter((p: any) => p.status === 'PAID');
  const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + (p.amount / 100), 0);
  
  let lastPaymentDate = 'Sin pagos';
  let lastPaymentAmount = 0;
  if (paidPayments.length > 0) {
    const sorted = [...paidPayments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    lastPaymentDate = formatDateDDMMYYYY(sorted[0].paymentDate);
    lastPaymentAmount = sorted[0].amount / 100;
  }
  
  const activeMs = memberStore.activeMemberships.find(m => m.status === 'ACTIVE');
  const nextDueDate = activeMs ? formatDateDDMMYYYY(activeMs.endDate) : 'N/A';
  
  return {
    totalPaid,
    lastPaymentDate,
    lastPaymentAmount,
    nextDueDate,
  };
});

const memberActivityLogs = computed(() => {
  return biometricStore.memberLogs;
});

const attendanceAnalytics = computed(() => {
  const logs = memberActivityLogs.value;
  const grantedLogs = logs.filter((l: any) => l.accessGranted);
  
  let lastVisit = 'Sin visitas';
  if (grantedLogs.length > 0) {
    const sorted = [...grantedLogs].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    lastVisit = formatDateTimeDDMMYYYY(sorted[0].scannedAt);
  }
  
  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7); // "2026-06"
  const visitsThisMonth = grantedLogs.filter((l: any) => l.scannedAt.startsWith(currentMonthStr)).length;
  
  return {
    lastVisit,
    visitsThisMonth,
  };
});

// Tendencia de visitas semanales (Sparkline de barras)
const weeklyVisitsTrend = computed(() => {
  const logs = memberActivityLogs.value.filter((l: any) => l.accessGranted);
  const days: string[] = [];
  const counts: number[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const count = logs.filter((l: any) => l.scannedAt.startsWith(dateStr)).length;
    const label = d.toLocaleDateString('es-MX', { weekday: 'narrow' }).toUpperCase();
    
    days.push(label);
    counts.push(count);
  }
  
  const max = Math.max(...counts, 1);
  return days.map((label, idx) => ({
    label,
    count: counts[idx],
    heightPercentage: counts[idx] > 0 ? Math.round((counts[idx] / max) * 100) : 0
  }));
});

// Notas estructuradas para la bitácora
const formattedNotes = computed(() => {
  if (!memberStore.selectedMember || !memberStore.selectedMember.notes) return [];
  const m = memberStore.selectedMember;
  return m.notes.map((note: string, idx: number) => {
    // Generar fechas relativas a la fecha de registro
    const regDate = new Date(m.registrationDate);
    regDate.setDate(regDate.getDate() + idx);
    const dateStr = formatDateDDMMYYYY(regDate);
    const timeStr = '10:30';
    return {
      content: note,
      author: m.createdByName || 'Staff de Recepción',
      avatarInitials: m.createdByName ? m.createdByName.charAt(0) : 'S',
      timestamp: `${dateStr} - ${timeStr} hrs`
    };
  });
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen bg-[#000000]">
    
    <!-- Título de Sección -->
    <div class="flex justify-between items-center pb-4 border-b border-gray-900/60">
      <div>
        <h2 class="text-3xl font-extrabold tracking-tight text-white font-sans">Directorio de Miembros</h2>
        <p class="text-xs text-neutral-400 mt-1 font-sans">Expedientes, estados de membresía y registros de entrada</p>
      </div>
      <button 
        v-if="authStore.hasPermission('manage:access')"
        @click="showAddMemberModal = true"
        class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 font-sans cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        <span>Nuevo Miembro</span>
      </button>
    </div>

    <!-- Layout de 12 Columnas -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- IZQUIERDA: Explorador de Miembros (col-span-4) -> ~30% de ancho -->
      <div class="lg:col-span-4 space-y-4">
        
        <!-- Tarjeta de Búsqueda y Filtros -->
        <div class="saas-card p-5 space-y-4">
          <div class="flex justify-between items-center">
            <h4 class="saas-title">EXPLORADOR</h4>
            <span class="text-[10px] bg-neutral-900 text-neutral-350 font-mono px-2.5 py-0.5 rounded-full font-bold border border-gray-800/60">
              {{ filteredMembers.length }} miembros
            </span>
          </div>
          
          <!-- Entrada de búsqueda con icono -->
          <div class="relative">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Buscar por nombre, folio..." 
              class="w-full saas-input saas-input-with-icon text-xs"
            />
            <span class="absolute left-3 top-2.5 text-neutral-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          <!-- Filtros Compactos -->
          <div class="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-900/40">
            <div>
              <label class="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Membresía</label>
              <select v-model="filterPlan" class="w-full saas-select text-[10px] py-1">
                <option value="ALL">Todos</option>
                <option value="NONE">Sin plan</option>
                <option v-for="plan in memberStore.plans" :key="plan.id" :value="plan.id">
                  {{ plan.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Estatus</label>
              <select v-model="filterStatus" class="w-full saas-select text-[10px] py-1">
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Suspendidos</option>
                <option value="EXPIRED">Vencidos</option>
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Ordenar por</label>
              <select v-model="sortBy" class="w-full saas-select text-[10px] py-1">
                <option value="MEMBER_NUMBER_ASC">Socio (Menor a Mayor)</option>
                <option value="MEMBER_NUMBER_DESC">Socio (Mayor a Menor)</option>
                <option value="ALPHABETICAL_ASC">Alfabeto (A-Z Apellido)</option>
                <option value="ALPHABETICAL_DESC">Alfabeto (Z-A Apellido)</option>
                <option value="EXPIRATION_DATE_ASC">Vencimiento (Más Próximo)</option>
                <option value="EXPIRATION_DATE_DESC">Vencimiento (Más Lejano)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Lista de Miembros con Skeletons -->
        <div class="saas-card p-2 max-h-[580px] overflow-y-auto space-y-1.5 shadow-xl">
          
          <!-- Skeletons de Carga -->
          <div v-if="isLoading" class="space-y-2 p-2">
            <div v-for="i in 5" :key="i" class="animate-pulse flex items-center space-x-3 p-3 rounded-xl bg-[#121212]">
              <div class="w-10 h-10 rounded-full bg-neutral-800"></div>
              <div class="flex-grow space-y-2">
                <div class="h-3 bg-neutral-800 rounded w-2/3"></div>
                <div class="h-2 bg-neutral-900 rounded w-1/2"></div>
              </div>
            </div>
          </div>

          <!-- Listado de Miembros -->
          <div v-else>
            <div 
              v-for="m in filteredMembers" 
              :key="m.id"
              @click="selectMember(m.id)"
              class="px-4 py-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-all border relative"
              :class="memberStore.selectedMember?.id === m.id ? 'bg-[#121212] border-[#F59E0B]/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-transparent hover:bg-[#121212]/50 hover:border-gray-900'"
            >
              <!-- Barra lateral de indicador de selección (Dorado) -->
              <div v-if="memberStore.selectedMember?.id === m.id" class="absolute left-0 top-3 bottom-3 w-1 bg-[#F59E0B] rounded-r-md"></div>

              <!-- Avatar -->
              <img :src="getMemberAvatarUrl(m)" alt="Avatar" class="w-10 h-10 rounded-full border border-gray-900 bg-[#000000] object-cover object-center" />
              
              <div class="flex-grow min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-bold text-white truncate pr-2">{{ m.firstName }} {{ m.lastName }}</p>
                  
                  <!-- Indicador de Estatus Activo (Verde) / Suspendido (Rojo) -->
                  <span class="w-2 h-2 rounded-full relative flex flex-shrink-0">
                    <span v-if="m.isActive" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2" :class="m.isActive ? 'bg-[#10B981]' : 'bg-[#FA2F2A]'"></span>
                  </span>
                </div>
                
                <div class="flex items-center justify-between text-[9px] mt-1 text-neutral-400 font-mono">
                  <span>{{ m.memberNumber }}</span>
                  <span 
                    v-if="m.hasActiveMembership" 
                    class="text-[#F59E0B] font-bold px-1.5 py-0.25 bg-[#F59E0B]/10 rounded border border-[#F59E0B]/20 max-w-[110px] truncate"
                  >
                    {{ m.activePlanName }}
                  </span>
                  <span v-else class="text-[#FA2F2A] font-bold px-1.5 py-0.25 bg-[#FA2F2A]/10 rounded border border-[#FA2F2A]/20">Sin Plan</span>
                </div>
              </div>
            </div>

            <!-- Estado Vacío -->
            <div v-if="filteredMembers.length === 0" class="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p class="text-xs font-bold text-neutral-300">No hay miembros</p>
              <p class="text-[10px] text-neutral-500 mt-1 mb-4 max-w-[200px]">Cree un nuevo expediente para comenzar.</p>
              <button 
                v-if="authStore.hasPermission('manage:access')"
                @click="showAddMemberModal = true"
                class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center space-x-1.5 cursor-pointer font-sans"
              >
                <span>Registrar Miembro</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- DERECHA: Ficha de detalles (col-span-8) -> ~70% de ancho -->
      <div class="lg:col-span-8">
        
        <!-- Skeleton de Carga de Detalles -->
        <div v-if="isDetailLoading" class="space-y-6">
          <div class="bg-[#0A0A0A] border border-gray-900 rounded-2xl p-6 flex items-center space-x-4 animate-pulse">
            <div class="w-20 h-20 rounded-2xl bg-neutral-800"></div>
            <div class="flex-grow space-y-3">
              <div class="h-6 bg-neutral-800 rounded w-1/3"></div>
              <div class="h-3 bg-neutral-900 rounded w-1/4"></div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div v-for="i in 3" :key="i" class="h-32 bg-[#0A0A0A] border border-gray-900 rounded-2xl p-5"></div>
          </div>
        </div>

        <!-- Ficha de Detalles del Miembro -->
        <div v-else-if="memberStore.selectedMember" class="space-y-6 animate-in fade-in duration-200">
          
          <!-- Encabezado de Perfil Principal -->
          <div class="saas-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <!-- Difuminado dorado de fondo decorativo -->
            <div class="absolute -top-12 -left-12 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-2xl pointer-events-none"></div>

            <div class="flex items-center space-x-5 relative z-10">
              <!-- Avatar Grande (80px) -->
              <div class="relative group flex-shrink-0">
                <img 
                  :src="getMemberAvatarUrl(memberStore.selectedMember)" 
                  alt="Avatar" 
                  class="w-20 h-20 rounded-2xl bg-[#000000] border border-gray-900 shadow-xl object-cover object-center" 
                />
                <span class="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span v-if="memberStore.selectedMember.isActive" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-[#10B981] border-2 border-[#0A0A0A]"></span>
                </span>
              </div>
              
              <div class="space-y-1.5">
                <div class="flex items-center gap-3 flex-wrap">
                  <!-- Nombre del Miembro: 28px bold -->
                  <h3 class="text-[28px] font-bold text-white tracking-tight leading-none">
                    {{ memberStore.selectedMember.firstName }} {{ memberStore.selectedMember.lastName }}
                  </h3>
                  
                  <!-- Insignia de Estatus -->
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider border font-mono"
                    :class="memberStore.selectedMember.isActive ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-[#FA2F2A]/10 text-[#FA2F2A] border-[#FA2F2A]/30'"
                  >
                    {{ memberStore.selectedMember.isActive ? 'ACTIVO' : 'SUSPENDIDO' }}
                  </span>
                  
                  <!-- Insignia de Sin Pago Requerido (Owner Benefit) -->
                  <span 
                    v-if="memberStore.selectedMember.noPaymentRequired"
                    class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider border font-mono bg-amber-400/10 text-amber-400 border-amber-400/30"
                  >
                    BENEFICIO: SIN COSTO
                  </span>
                </div>
                
                <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-neutral-400 font-mono">
                  <span>FOLIO: <strong class="text-white">{{ memberStore.selectedMember.memberNumber }}</strong></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-neutral-800"></span>
                  <span v-if="membershipProgress" class="text-[#F59E0B] font-semibold">
                    PLAN: <strong class="text-white font-bold">{{ membershipProgress.planName }}</strong>
                  </span>
                  <span v-else class="text-[#FA2F2A] font-bold">SIN PLAN</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-neutral-800"></span>
                  <span>REGISTRO: <strong class="text-white">{{ memberStore.selectedMember.registrationDate }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex items-center space-x-2.5 w-full md:w-auto justify-end relative z-10">
              <button 
                v-if="authStore.hasPermission('manage:access')"
                @click="openEditMemberModal"
                class="bg-neutral-900 hover:bg-neutral-850 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-800/80 cursor-pointer"
              >
                Editar Perfil
              </button>
              <button 
                v-if="authStore.hasPermission('manage:memberships')"
                @click="openRenewPlanModal"
                class="bg-[#F59E0B] hover:bg-[#d97706] text-black px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-102"
              >
                Renovar Plan
              </button>
              <button 
                v-if="authStore.hasPermission('manage:access') && memberStore.selectedMember.isActive"
                @click="triggerDeactivate"
                class="bg-[#FA2F2A]/10 border border-[#FA2F2A]/20 text-[#FA2F2A] hover:bg-[#FA2F2A] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Suspender Miembro
              </button>
              <button 
                v-if="authStore.hasPermission('manage:access') && !memberStore.selectedMember.isActive"
                @click="handleReactivate"
                class="bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] hover:bg-[#10B981] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reactivar Miembro
              </button>
            </div>
          </div>

          <!-- Navegación de Píldoras Modernas -->
          <div class="flex bg-[#0A0A0A] border border-gray-900 p-1.5 rounded-xl text-xs font-bold text-neutral-400 space-x-2 shadow-md max-w-2xl">
            <button 
              @click="activeTab = 'overview'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'overview' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Vista General
            </button>
            <button 
              @click="activeTab = 'memberships'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'memberships' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Historial de Planes
            </button>
            <button 
              @click="activeTab = 'payments'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'payments' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Recibos de Pago
            </button>
            <button 
              @click="activeTab = 'activity'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'activity' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Registro de Accesos
            </button>
            <button 
              @click="activeTab = 'biometrics'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'biometrics' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Biometría / Huellas
            </button>
            <button 
              @click="activeTab = 'documents'"
              class="flex-1 py-2 rounded-lg text-center transition-all cursor-pointer text-[10px] uppercase tracking-wider font-mono"
              :class="activeTab === 'documents' ? 'bg-[#121212] text-white border border-gray-850 shadow-inner' : 'hover:text-white hover:bg-[#121212]/30'"
            >
              Documentos
            </button>
          </div>

          <!-- CONTENIDOS DE PESTAÑA -->

          <!-- PESTAÑA 1: VISTA GENERAL (OVERVIEW) -->
          <div v-if="activeTab === 'overview'" class="space-y-6">
            
            <!-- Resumen de Tarjetas / Widgets (Fila Superior) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <!-- Widget 1: Progreso de Membresía -->
              <div class="saas-card p-5 flex flex-col justify-between space-y-4">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <p class="saas-label">Progreso de Membresía</p>
                    <h5 class="text-xs font-bold text-white leading-none mt-1">
                      {{ membershipProgress ? membershipProgress.planName : 'Sin Plan Activo' }}
                    </h5>
                  </div>
                  <span class="p-2 rounded-xl bg-amber-500/10 text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                </div>

                <div v-if="membershipProgress" class="space-y-2">
                  <div class="flex justify-between text-xs font-mono">
                    <span class="text-neutral-450">Días transcurridos:</span>
                    <span class="text-[#F59E0B] font-bold">{{ membershipProgress.daysPassed }} / {{ membershipProgress.totalDays }}</span>
                  </div>
                  <!-- Barra de progreso -->
                  <div class="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-gray-800/80">
                    <div 
                      class="bg-[#F59E0B] h-full rounded-full transition-all duration-300"
                      :style="{ width: `${membershipProgress.percentage}%` }"
                    ></div>
                  </div>
                  <p class="text-[9px] text-neutral-500 text-right">Vence el: {{ membershipProgress.endDate }}</p>
                </div>
                <div v-else class="text-xs text-neutral-500 italic py-4">
                  Ningún plan de membresía activo actualmente.
                </div>
              </div>

              <!-- Widget 2: Resumen Financiero -->
              <div class="saas-card p-5 flex flex-col justify-between space-y-4">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <p class="saas-label">Resumen de Pagos</p>
                    <h5 class="text-xs font-bold text-white leading-none mt-1">
                      Total Pagado: <span class="text-[#10B981] font-bold">${{ paymentSummary.totalPaid.toLocaleString('es-MX') }}</span>
                    </h5>
                  </div>
                  <span class="p-2 rounded-xl bg-emerald-500/10 text-[#10B981]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>

                <div class="space-y-1.5 text-xs font-mono">
                  <div class="flex justify-between">
                    <span class="text-neutral-450">Último Pago:</span>
                    <span class="text-white">{{ paymentSummary.lastPaymentDate }}</span>
                  </div>
                  <div class="flex justify-between pt-1 border-t border-gray-900/40">
                    <span class="text-neutral-455">Próximo Vto:</span>
                    <span class="text-white font-bold text-[#F59E0B]">{{ paymentSummary.nextDueDate }}</span>
                  </div>
                </div>
              </div>

              <!-- Widget 3: Análisis de Asistencia -->
              <div class="saas-card p-5 flex flex-col justify-between space-y-3">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <p class="saas-label">Análisis de Asistencia</p>
                    <h5 class="text-xs font-bold text-white leading-none mt-1">
                      Visitas del Mes: <span class="text-[#F59E0B] font-bold">{{ attendanceAnalytics.visitsThisMonth }}</span>
                    </h5>
                  </div>
                  <span class="p-2 rounded-xl bg-red-500/10 text-[#FA2F2A]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>

                <!-- Gráfico de tendencia mini (barras doradas y fondo negro) -->
                <div class="flex items-end justify-between h-12 pt-2 px-1">
                  <div v-for="(day, idx) in weeklyVisitsTrend" :key="idx" class="flex flex-col items-center flex-1 group">
                    <div class="w-3.5 rounded-t-sm bg-neutral-900 relative transition-all duration-300 hover:bg-[#F59E0B] flex items-end h-full border border-gray-800/40">
                      <div 
                        class="w-full rounded-t-sm bg-gradient-to-t from-red-600 to-[#F59E0B] transition-all duration-500" 
                        :style="{ height: `${day.heightPercentage}%` }"
                      ></div>
                      <!-- Tooltip -->
                      <span class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#121212] border border-gray-800 text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-bold text-white">
                        {{ day.count }} visitas
                      </span>
                    </div>
                    <span class="text-[8px] text-neutral-500 mt-1 font-mono uppercase">{{ day.label }}</span>
                  </div>
                </div>

                <div class="flex justify-between text-[9px] text-neutral-400 font-mono">
                  <span>Último acceso:</span>
                  <span class="text-white font-bold truncate max-w-[130px]">{{ attendanceAnalytics.lastVisit }}</span>
                </div>
              </div>

            </div>

            <!-- Fila 1 y Fila 2 de Detalles Generales -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Tarjeta 1: Información Personal -->
              <div class="saas-card p-6 space-y-4">
                <div class="flex items-center space-x-2.5 pb-2.5 border-b border-gray-900/40">
                  <span class="text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <h4 class="saas-title">Información Personal</h4>
                </div>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Género</span>
                    <span class="saas-value">{{ memberStore.selectedMember.gender }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Fecha de Nacimiento</span>
                    <span class="saas-value">{{ memberStore.selectedMember.birthDate }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Correo Electrónico</span>
                    <span class="saas-value truncate max-w-[180px]">{{ memberStore.selectedMember.email || 'No registrado' }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5">
                    <span class="saas-label">Teléfono</span>
                    <span class="saas-value">{{ memberStore.selectedMember.phone }}</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 2: Dirección -->
              <div class="saas-card p-6 space-y-4">
                <div class="flex items-center space-x-2.5 pb-2.5 border-b border-gray-900/40">
                  <span class="text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <h4 class="saas-title">Dirección</h4>
                </div>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Calle y Número</span>
                    <span class="saas-value">{{ memberStore.selectedMember.street }} {{ memberStore.selectedMember.number }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Ciudad</span>
                    <span class="saas-value">{{ memberStore.selectedMember.city }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Estado</span>
                    <span class="saas-value">{{ memberStore.selectedMember.state }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5">
                    <span class="saas-label">Código Postal</span>
                    <span class="saas-value font-mono">{{ memberStore.selectedMember.postalCode }}</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 3: Contacto de Emergencia -->
              <div class="saas-card p-6 space-y-4">
                <div class="flex items-center space-x-2.5 pb-2.5 border-b border-gray-900/40">
                  <span class="text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  <h4 class="saas-title">Contacto de Emergencia</h4>
                </div>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Nombre de Contacto</span>
                    <span class="saas-value">{{ memberStore.selectedMember.emergencyContactName || 'No registrado' }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Parentesco</span>
                    <span class="saas-value">{{ memberStore.selectedMember.emergencyContactRelationship || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5">
                    <span class="saas-label">Teléfono de Contacto</span>
                    <span class="saas-value text-[#F59E0B] font-mono">{{ memberStore.selectedMember.emergencyContactPhone || 'N/A' }}</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 4: Expediente de Gimnasio -->
              <div class="saas-card p-6 space-y-4">
                <div class="flex items-center space-x-2.5 pb-2.5 border-b border-gray-900/40">
                  <span class="text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </span>
                  <h4 class="saas-title">Expediente de Gimnasio</h4>
                </div>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Registrado por</span>
                    <span class="saas-value">{{ memberStore.selectedMember.createdByName || 'Sistema' }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5 border-b border-neutral-900/30">
                    <span class="saas-label">Fecha de Registro</span>
                    <span class="saas-value font-mono">{{ memberStore.selectedMember.registrationDate }}</span>
                  </div>
                  <div class="flex justify-between items-center py-0.5">
                    <span class="saas-label">Última Actualización</span>
                    <span class="saas-value">{{ memberStore.selectedMember.updatedByName || 'Ninguno' }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Bitácora de Observaciones -->
            <div class="saas-card p-6 space-y-6 relative">
              <div class="flex justify-between items-center pb-3 border-b border-gray-900/40">
                <div class="flex items-center space-x-2.5">
                  <span class="text-[#F59E0B]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </span>
                  <h4 class="saas-title">Bitácora de Observaciones</h4>
                </div>
                <!-- Botón de toggle en el encabezado -->
                <button 
                  v-if="authStore.hasPermission('manage:access')"
                  @click="toggleAddNote"
                  class="bg-[#F59E0B] hover:bg-[#d97706] text-black px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md hover:scale-102 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Agregar Nota</span>
                </button>
              </div>

              <!-- Formulario expandible para añadir nota (ahora arriba de la línea de tiempo) -->
              <div v-if="showNoteInput" class="bg-[#121212]/80 border border-gray-800 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Añadir Observación</span>
                  <button @click="showNoteInput = false" class="text-neutral-400 hover:text-white text-base">&times;</button>
                </div>
                <textarea 
                  v-model="noteText" 
                  placeholder="Ingrese el texto de la observación..." 
                  rows="3"
                  class="w-full bg-[#000000] border border-gray-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#F59E0B]"
                ></textarea>
                <div class="flex justify-end space-x-2">
                  <button 
                    @click="showNoteInput = false"
                    class="bg-neutral-900 hover:bg-neutral-850 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    @click="saveNote"
                    class="bg-[#F59E0B] hover:bg-[#d97706] text-black px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <!-- Componente de línea de tiempo de notas -->
              <div class="relative pl-8 border-l-2 border-gray-900/80 space-y-6 mt-4 pb-2">
                <div v-for="(note, idx) in formattedNotes" :key="idx" class="relative group">
                  <!-- Marcador de nodo (Dorado) -->
                  <span class="absolute -left-[41px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#121212] ring-4 ring-[#000000] transition-colors group-hover:bg-[#F59E0B]">
                    <span class="h-2 w-2 rounded-full bg-[#F59E0B] group-hover:bg-[#000000] transition-colors"></span>
                  </span>
                  
                  <div class="bg-[#121212]/50 border border-gray-900 rounded-xl p-4.5 space-y-2.5 hover:border-gray-800 transition-all hover:bg-[#121212]/80">
                    <div class="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                      <div class="flex items-center space-x-2">
                        <!-- Iniciales de staff -->
                        <div class="w-6 h-6 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center text-[10px] font-bold uppercase">
                          {{ note.avatarInitials }}
                        </div>
                        <span class="font-bold text-neutral-200">{{ note.author }}</span>
                      </div>
                      <span class="text-neutral-500 font-semibold">{{ note.timestamp }}</span>
                    </div>
                    <p class="text-xs text-neutral-200 leading-relaxed font-sans">{{ note.content }}</p>
                  </div>
                </div>
                
                <p v-if="formattedNotes.length === 0" class="text-neutral-500 italic text-xs py-4 pl-2">
                  No hay observaciones registradas en este expediente.
                </p>
              </div>
            </div>

          </div>

          <!-- PESTAÑA 2: HISTORIAL DE PLANES -->
          <div v-if="activeTab === 'memberships'" class="saas-card p-6 space-y-4 animate-in fade-in duration-150">
            <h4 class="saas-title pb-2 border-b border-gray-900/50">Historial de Planes Adquiridos</h4>
            <div class="overflow-x-auto font-sans">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-900 text-neutral-450 font-bold uppercase tracking-wider text-[10px]">
                    <th class="p-3">Plan de Acceso</th>
                    <th class="p-3">Fecha Inicio</th>
                    <th class="p-3">Fecha Término</th>
                    <th class="p-3">Estatus</th>
                    <th v-if="authStore.userRole === 'owner'" class="p-3 text-right">Auditoría</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-950/40">
                  <tr v-for="ms in memberStore.activeMemberships" :key="ms.id" class="hover:bg-[#121212]/30 transition-colors">
                    <td class="p-3 font-bold text-white">{{ ms.planName }}</td>
                    <td class="p-3 text-neutral-400 font-mono">{{ formatDateDDMMYYYY(ms.startDate) }}</td>
                    <td class="p-3 text-neutral-400 font-mono">{{ formatDateDDMMYYYY(ms.endDate) }}</td>
                    <td class="p-3">
                      <span 
                        class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono"
                        :class="{
                          'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20': ms.status === 'ACTIVE',
                          'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20': ms.status === 'PENDING',
                          'bg-[#FA2F2A]/10 text-[#FA2F2A] border-[#FA2F2A]/20': ms.status === 'EXPIRED',
                          'bg-neutral-900/40 text-neutral-500 border-neutral-900': ms.status === 'CANCELLED',
                        }"
                      >
                        {{ ms.status === 'ACTIVE' ? 'ACTIVA' : ms.status === 'PENDING' ? 'PENDIENTE' : ms.status === 'EXPIRED' ? 'EXPIRADA' : 'CANCELADA' }}
                      </span>
                    </td>
                    <td v-if="authStore.userRole === 'owner'" class="p-3 text-right">
                      <button 
                        @click="openEditMembership(ms)"
                        class="text-[10px] font-bold text-neutral-300 bg-neutral-900 hover:bg-neutral-850 px-3 py-1.5 rounded-lg border border-gray-800 transition-all cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                  <tr v-if="memberStore.activeMemberships.length === 0">
                    <td colspan="5" class="p-8 text-center text-neutral-500 italic">No se han registrado contrataciones previas.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- PESTAÑA 3: RECIBOS DE PAGO -->
          <div v-if="activeTab === 'payments'" class="saas-card p-6 space-y-4 animate-in fade-in duration-150">
            <div class="flex justify-between items-center pb-2 border-b border-gray-900/50">
              <h4 class="saas-title">Cobros y Facturación Emitida</h4>
              <button 
                @click="openRegisterPaymentModal"
                class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer font-sans"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Registrar Pago</span>
              </button>
            </div>
            <div class="overflow-x-auto font-sans">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-900 text-neutral-450 font-bold uppercase tracking-wider text-[10px]">
                    <th class="p-3">Ref. Recibo</th>
                    <th class="p-3">Método de Pago</th>
                    <th class="p-3">Fecha y Hora</th>
                    <th class="p-3">Cajero / Receptor</th>
                    <th class="p-3">Monto</th>
                    <th class="p-3">Estatus</th>
                    <th class="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-950/40 font-mono">
                  <tr v-for="pay in memberStore.activePayments" :key="pay.id" class="hover:bg-[#121212]/30 transition-colors">
                    <td class="p-3 font-bold text-[#F59E0B]">{{ pay.referenceNumber }}</td>
                    <td class="p-3 text-neutral-300 font-sans">{{ pay.paymentMethodName }}</td>
                    <td class="p-3 text-neutral-400">{{ formatDateTimeDDMMYYYY(pay.paymentDate) }}</td>
                    <td class="p-3 text-neutral-300 font-sans">{{ pay.processedByName || 'Cajero' }}</td>
                    <td class="p-3 font-bold text-white">
                      <div>${{ pay.amount / 100 }} MXN</div>
                      <div v-if="pay.discount && pay.discount > 0" class="text-[9px] text-[#F59E0B] font-bold mt-0.5">
                        (Desc: -${{ pay.discount / 100 }} MXN)
                      </div>
                    </td>
                    <td class="p-3">
                      <span 
                        class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono"
                        :class="pay.status === 'PAID' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-[#FA2F2A]/10 text-[#FA2F2A] border-[#FA2F2A]/20'"
                      >
                        {{ pay.status === 'PAID' ? 'PAGADO' : 'REEMBOLSADO' }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-sans">
                      <button 
                        @click="downloadReceipt(pay)"
                        class="px-2 py-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 hover:text-white rounded-lg text-neutral-300 transition-all cursor-pointer text-[10px] font-bold inline-flex items-center space-x-1"
                        title="Descargar PDF"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Ticket</span>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="memberStore.activePayments.length === 0">
                    <td colspan="6" class="p-8 text-center text-neutral-500 italic font-sans">No hay historial de cobros registrado para este miembro.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- PESTAÑA 4: REGISTRO DE ACCESOS -->
          <div v-if="activeTab === 'activity'" class="saas-card p-6 space-y-4 animate-in fade-in duration-150">
            <h4 class="saas-title pb-2 border-b border-gray-900/50">Historial de Accesos Biométricos</h4>
            <div class="overflow-x-auto font-sans">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-900 text-neutral-450 font-bold uppercase tracking-wider text-[10px]">
                    <th class="p-3">Fecha y Hora</th>
                    <th class="p-3">Método / Canal</th>
                    <th class="p-3">Estatus</th>
                    <th class="p-3 text-right">Detalle / Alarma</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-950/40 font-mono">
                  <tr v-for="log in memberActivityLogs" :key="log.id" class="hover:bg-[#121212]/30 transition-colors">
                    <td class="p-3 text-white">{{ formatDateTimeDDMMYYYY(log.scannedAt) }}</td>
                    <td class="p-3 text-neutral-400 font-sans">Lector Huella USB</td>
                    <td class="p-3">
                      <span 
                        class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-sans"
                        :class="log.accessGranted ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-[#FA2F2A]/10 text-[#FA2F2A] border-[#FA2F2A]/20'"
                      >
                        {{ log.accessGranted ? 'CONCEDIDO' : 'RECHAZADO' }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-sans" :class="log.accessGranted ? 'text-[#10B981]' : 'text-[#FA2F2A] font-semibold'">
                      {{ log.accessGranted ? 'Acceso correcto' : 'Membresía Vencida / Huella Inválida' }}
                    </td>
                  </tr>
                  <tr v-if="memberActivityLogs.length === 0">
                    <td colspan="4" class="p-8 text-center text-neutral-500 italic font-sans">No se han registrado accesos aún.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- PESTAÑA 5: ARCHIVOS / DOCUMENTOS -->
          <div v-if="activeTab === 'documents'" class="saas-card p-6 space-y-6 animate-in fade-in duration-150">
            <div class="flex justify-between items-center border-b border-gray-900 pb-3">
              <h4 class="saas-title">Expediente de Documentos</h4>
              <span class="text-[10px] text-neutral-500 font-mono">PDF ÚNICAMENTE</span>
            </div>

            <!-- Upload document Form -->
            <form v-if="authStore.hasPermission('manage:access')" @submit.prevent="handleUploadDocument" class="bg-[#0A0A0A] p-4 rounded-xl border border-gray-900 space-y-4">
              <h5 class="text-xs font-bold text-white uppercase tracking-wider">Subir nuevo documento</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono mb-2">Resumen / Nombre del Documento</label>
                  <input 
                    v-model="documentSummary" 
                    type="text" 
                    required 
                    placeholder="Ej. Contrato, Certificado Médico" 
                    class="w-full bg-[#121212] border border-gray-850 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono mb-2">Archivo PDF</label>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    required 
                    @change="onPdfFileChange"
                    class="w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-850 cursor-pointer"
                  />
                </div>
              </div>
              
              <div v-if="docErrorMsg" class="text-xs text-[#FA2F2A] font-semibold">
                {{ docErrorMsg }}
              </div>

              <div class="flex justify-end pt-2">
                <button 
                  type="submit" 
                  :disabled="isUploadingDoc || !selectedPdfFile || !documentSummary.trim()"
                  class="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-30 flex items-center space-x-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{{ isUploadingDoc ? 'Subiendo...' : 'Guardar Documento' }}</span>
                </button>
              </div>
            </form>

            <!-- Documents list -->
            <div class="space-y-3">
              <h5 class="text-xs font-bold text-neutral-400 uppercase tracking-wider">Documentos Guardados</h5>
              <div class="grid grid-cols-1 gap-2.5">
                <div 
                  v-for="doc in memberStore.selectedMemberDocuments" 
                  :key="doc.id" 
                  class="p-4 bg-[#0A0A0A] border border-gray-900 rounded-xl flex items-center justify-between hover:border-gray-800 transition-all group"
                >
                  <div class="flex items-center space-x-3">
                    <div class="p-2.5 bg-red-950/20 text-[#FA2F2A] border border-red-900/30 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h6 class="text-xs font-bold text-white uppercase">{{ doc.summary }}</h6>
                      <p class="text-[9px] text-neutral-500 font-mono mt-0.5">Subido el: {{ formatDateTimeDDMMYYYY(doc.uploadedAt) }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center space-x-2">
                    <button 
                      @click="downloadDocument(doc)"
                      class="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-neutral-350 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider font-mono flex items-center space-x-1"
                      title="Descargar PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span class="hidden sm:inline">Descargar</span>
                    </button>
                    
                    <button 
                      v-if="authStore.hasPermission('manage:access')"
                      @click="handleDeleteDocument(doc.id)"
                      class="p-2 bg-neutral-900 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 rounded-lg text-neutral-450 hover:text-[#FA2F2A] transition-all"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div v-if="memberStore.selectedMemberDocuments.length === 0" class="p-8 text-center text-neutral-500 italic font-sans border border-dashed border-gray-900 rounded-xl">
                  No se han registrado documentos en el expediente de este miembro.
                </div>
              </div>
            </div>
          </div>

          <!-- PESTAÑA 6: BIOMETRÍA / HUELLAS -->
          <div v-if="activeTab === 'biometrics'" class="saas-card p-6 space-y-6 animate-in fade-in duration-150">
            <div class="flex justify-between items-center border-b border-gray-900 pb-3">
              <div>
                <h4 class="saas-title">Expediente de Biometría dactilar</h4>
                <p class="text-[10px] text-neutral-500 font-mono mt-0.5">Estándar ISO/IEC 19794-2 • Agente local: ws://localhost:9000</p>
              </div>
              <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                Lector Activo
              </span>
            </div>

            <!-- List of fingers standard (0-9) represented as left/right hands side by side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Mano Izquierda (Left Hand) -->
              <div class="space-y-3.5">
                <div class="border-b border-gray-900 pb-2 flex justify-between items-center px-1">
                  <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mano Izquierda</span>
                  <span class="text-[9px] font-mono text-neutral-500">Pulgar → Meñique</span>
                </div>
                
                <div class="space-y-3">
                  <div 
                    v-for="finger in leftHandFingers" 
                    :key="finger.index" 
                    class="p-4 bg-[#0A0A0A] border rounded-xl flex items-center justify-between transition-all hover:border-gray-800"
                    :class="isFingerEnrolled(finger.index) ? 'border-emerald-900/40' : 'border-gray-900'"
                  >
                    <div class="flex items-center space-x-3.5">
                      <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center border font-mono text-xs font-bold"
                        :class="isFingerEnrolled(finger.index) ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-neutral-900 border-gray-850 text-neutral-500'"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.917 13.917 0 00-2.338-7.794M21 12c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09a13.916 13.916 0 002.002-7.643 13.916 13.916 0 00-2.338-7.794M12 11c0-1.11-.274-2.158-.758-3.08a9.96 9.96 0 011.516-3.896M12 11c0 1.11-.274 2.158-.758 3.08M12 3a9.96 9.96 0 00-3.243.539M9 21a9.96 9.96 0 003.243-.539M9 21c-1.11 0-2.158-.274-3.08-.758M9 21a9.96 9.96 0 003.243-.539M9 3a9.96 9.96 0 013.08.758M6.079 5.243A9.967 9.967 0 019 4.08M6.079 18.757A9.967 9.967 0 019 19.92" />
                        </svg>
                      </div>
                      <div>
                        <h6 class="text-xs font-bold text-white">{{ finger.name }}</h6>
                        <p class="text-[9px] font-mono text-neutral-500 mt-0.5">
                          {{ isFingerEnrolled(finger.index) ? `Registrada: ${getFingerEnrollmentDate(finger.index)}` : 'Sin registrar' }}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <button 
                        v-if="!isFingerEnrolled(finger.index) && authStore.hasPermission('manage:memberships')"
                        @click="openEnrollFinger(finger.index)"
                        class="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border border-gray-850 font-mono"
                      >
                        Enrolar
                      </button>
                      <button 
                        v-if="isFingerEnrolled(finger.index) && authStore.hasPermission('manage:memberships')"
                        @click="deleteFingerprint(finger.index)"
                        class="p-2 bg-neutral-900 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 rounded-lg text-neutral-450 hover:text-[#FA2F2A] transition-all cursor-pointer"
                        title="Eliminar huella"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mano Derecha (Right Hand) -->
              <div class="space-y-3.5">
                <div class="border-b border-gray-900 pb-2 flex justify-between items-center px-1">
                  <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mano Derecha</span>
                  <span class="text-[9px] font-mono text-neutral-500">Pulgar → Meñique</span>
                </div>
                
                <div class="space-y-3">
                  <div 
                    v-for="finger in rightHandFingers" 
                    :key="finger.index" 
                    class="p-4 bg-[#0A0A0A] border rounded-xl flex items-center justify-between transition-all hover:border-gray-800"
                    :class="isFingerEnrolled(finger.index) ? 'border-emerald-900/40' : 'border-gray-900'"
                  >
                    <div class="flex items-center space-x-3.5">
                      <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center border font-mono text-xs font-bold"
                        :class="isFingerEnrolled(finger.index) ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-neutral-900 border-gray-850 text-neutral-500'"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.917 13.917 0 00-2.338-7.794M21 12c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09a13.916 13.916 0 002.002-7.643 13.916 13.916 0 00-2.338-7.794M12 11c0-1.11-.274-2.158-.758-3.08a9.96 9.96 0 011.516-3.896M12 11c0 1.11-.274 2.158-.758 3.08M12 3a9.96 9.96 0 00-3.243.539M9 21a9.96 9.96 0 003.243-.539M9 21c-1.11 0-2.158-.274-3.08-.758M9 21a9.96 9.96 0 003.243-.539M9 3a9.96 9.96 0 013.08.758M6.079 5.243A9.967 9.967 0 019 4.08M6.079 18.757A9.967 9.967 0 019 19.92" />
                        </svg>
                      </div>
                      <div>
                        <h6 class="text-xs font-bold text-white">{{ finger.name }}</h6>
                        <p class="text-[9px] font-mono text-neutral-500 mt-0.5">
                          {{ isFingerEnrolled(finger.index) ? `Registrada: ${getFingerEnrollmentDate(finger.index)}` : 'Sin registrar' }}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <button 
                        v-if="!isFingerEnrolled(finger.index) && authStore.hasPermission('manage:memberships')"
                        @click="openEnrollFinger(finger.index)"
                        class="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border border-gray-850 font-mono"
                      >
                        Enrolar
                      </button>
                      <button 
                        v-if="isFingerEnrolled(finger.index) && authStore.hasPermission('manage:memberships')"
                        @click="deleteFingerprint(finger.index)"
                        class="p-2 bg-neutral-900 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 rounded-lg text-neutral-450 hover:text-[#FA2F2A] transition-all cursor-pointer"
                        title="Eliminar huella"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Sin miembro seleccionado (Vacío) -->
        <div v-else class="saas-card p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-neutral-700 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="text-base font-bold text-white">Ningún Perfil Seleccionado</h3>
          <p class="text-xs text-neutral-400 mt-2 max-w-sm">Seleccione un miembro de la lista del explorador izquierdo para visualizar su bitácora, finanzas y auditorías del plan.</p>
        </div>

      </div>

    </div>

    <!-- MODAL 1: EDITAR PERFIL MIEMBRO -->
    <div v-if="showEditMemberModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-2xl w-full p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 my-8">
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-900">
          <h4 class="saas-title">Editar Perfil del Miembro</h4>
          <button @click="showEditMemberModal = false" class="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <form @submit.prevent="handleSaveMember" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Nombre</label>
              <input v-model="editMemberForm.firstName" type="text" required class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Apellidos</label>
              <input v-model="editMemberForm.lastName" type="text" required class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Género</label>
              <select v-model="editMemberForm.gender" class="w-full saas-select">
                <option>Masculino</option>
                <option>Femenino</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha de Nacimiento</label>
              <input v-model="editMemberForm.birthDate" type="date" required class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input v-model="editMemberForm.email" type="email" class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Teléfono</label>
              <input v-model="editMemberForm.phone" type="text" required class="w-full saas-input" />
            </div>
          </div>

          <div class="border-t border-gray-900 pt-4">
            <h5 class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Dirección</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Calle</label>
                <input v-model="editMemberForm.street" type="text" class="w-full saas-input" />
              </div>
              <div>
                <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Número</label>
                <input v-model="editMemberForm.number" type="text" class="w-full saas-input" />
              </div>
              <div>
                <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Ciudad</label>
                <input v-model="editMemberForm.city" type="text" class="w-full saas-input" />
              </div>
              <div>
                <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Estado</label>
                <input v-model="editMemberForm.state" type="text" class="w-full saas-input" />
              </div>
              <div>
                <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Código Postal</label>
                <input v-model="editMemberForm.postalCode" type="text" class="w-full saas-input" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-900 pt-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">C. Emergencia Nombre</label>
              <input v-model="editMemberForm.emergencyContactName" type="text" class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">C. Emergencia Teléfono</label>
              <input v-model="editMemberForm.emergencyContactPhone" type="text" class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Parentesco</label>
              <input v-model="editMemberForm.emergencyContactRelationship" type="text" class="w-full saas-input" />
            </div>
          </div>

          <div class="border-t border-gray-900 pt-4">
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Foto de Perfil</label>
            <div class="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <div class="w-32 h-32 border border-neutral-900 rounded-xl bg-neutral-950 flex items-center justify-center overflow-hidden relative">
                <video v-if="cameraEditActive && !capturedEditPhoto" ref="videoEditRef" autoplay playsinline class="w-full h-full object-cover"></video>
                <img v-else-if="capturedEditPhoto || editMemberForm.photoUrl" :src="capturedEditPhoto || editMemberForm.photoUrl" class="w-full h-full object-cover" />
                <div v-else class="text-neutral-500 text-[10px] text-center p-2 font-mono">SIN FOTO</div>
              </div>
              
              <div class="flex flex-col space-y-2">
                <input type="file" ref="fileEditInputRef" accept="image/*" class="hidden" @change="onEditFileChange" />
                
                <div class="flex space-x-2">
                  <button type="button" @click="triggerEditFileSelect" class="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-gray-800/60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Subir Archivo</span>
                  </button>

                  <button v-if="editMemberForm.photoUrl" type="button" @click="removeEditPhoto" class="px-3 py-2.5 bg-neutral-900 hover:bg-red-950/40 hover:text-red-500 text-neutral-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-gray-800/60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Quitar Foto</span>
                  </button>
                </div>

                <button v-if="!cameraEditActive" type="button" @click="startEditCamera" class="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-gray-800/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 11-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Usar Cámara</span>
                </button>
                <div v-else class="flex space-x-2">
                  <button type="button" @click="captureEditSnapshot" class="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">Tomar Foto</button>
                  <button type="button" @click="stopEditCamera" class="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-800">Cancelar</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Owner only: no payment required toggle -->
          <div v-if="authStore.userRole === 'owner'" class="border-t border-gray-900 pt-4 flex items-center justify-between">
            <div>
              <label class="block font-bold text-neutral-300 uppercase tracking-wider text-[10px]">No requiere pago</label>
              <p class="text-[9px] text-neutral-500">Activa automáticamente las nuevas membresías sin requerir un pago registrado.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input v-model="editMemberForm.noPaymentRequired" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-neutral-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 peer-checked:after:bg-[#F59E0B] after:border-gray-305 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F59E0B]/20 border border-gray-800"></div>
            </label>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end">
            <button 
              type="button" 
              @click="showEditMemberModal = false"
              class="bg-neutral-900 hover:bg-neutral-850 text-white py-2 px-4 rounded-xl font-bold transition-all cursor-pointer border border-gray-800"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="bg-[#F59E0B] hover:bg-[#d97706] text-black py-2 px-5 rounded-xl font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE REGISTRO DE PAGO (NUEVO) -->
    <div v-if="showRegisterPaymentModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 my-8">
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-900">
          <h4 class="saas-title">Registrar Recibo de Pago</h4>
          <button @click="showRegisterPaymentModal = false" class="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <form @submit.prevent="handleRegisterPayment" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Membresía Pendiente por Pagar</label>
            <select v-model="paymentForm.membershipId" @change="onPaymentPlanChange" required class="w-full saas-select">
              <option value="" disabled>Seleccione membresía...</option>
              <option v-for="m in memberPendingMemberships" :key="m.id" :value="m.id">
                {{ m.planName }} ({{ formatDateDDMMYYYY(m.startDate) }} al {{ formatDateDDMMYYYY(m.endDate) }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Método de Pago</label>
            <select v-model="paymentForm.paymentMethodId" required class="w-full saas-select">
              <option value="90000000-0000-0000-0000-000000000001">Efectivo</option>
              <option value="90000000-0000-0000-0000-000000000002">Tarjeta de Débito</option>
              <option value="90000000-0000-0000-0000-000000000003">Tarjeta de Crédito</option>
              <option value="90000000-0000-0000-0000-000000000004">Transferencia Bancaria</option>
              <option value="90000000-0000-0000-0000-000000000005">Pago Mixto / Combinado</option>
            </select>
          </div>

          <!-- Pago Mixto breakdown -->
          <div v-if="paymentForm.paymentMethodId === '90000000-0000-0000-0000-000000000005'" class="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
            <p class="text-xs font-bold text-neutral-400 mb-1">Desglose de Pago Mixto (MXN)</p>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Efectivo</label>
                <input v-model.number="mixedPaymentEfectivo" type="number" @input="updateMixedTotal" min="0" class="w-full saas-input py-1 px-2 text-xs" />
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Tarjeta</label>
                <input v-model.number="mixedPaymentTarjeta" type="number" @input="updateMixedTotal" min="0" class="w-full saas-input py-1 px-2 text-xs" />
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Transf.</label>
                <input v-model.number="mixedPaymentTransferencia" type="number" @input="updateMixedTotal" min="0" class="w-full saas-input py-1 px-2 text-xs" />
              </div>
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Referencia de Pago (Opcional)</label>
            <input v-model="paymentForm.referenceNumber" type="text" placeholder="Ej: Depósito, Ref. Bancaria" class="w-full saas-input" />
          </div>

          <!-- Discount (Admins and Owners Only) -->
          <div v-if="authStore.userRole === 'owner' || authStore.userRole === 'administrator'">
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Descuento Aplicado (MXN)</label>
            <input 
              v-model.number="paymentForm.discount" 
              type="number" 
              min="0" 
              :max="getPlanPriceForSelected()" 
              @input="onDiscountChange" 
              class="w-full saas-input font-bold font-mono text-amber-500 text-sm" 
              placeholder="0.00"
            />
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto a Cobrar (MXN)</label>
            <input 
              v-model.number="paymentForm.amount" 
              type="number" 
              required 
              min="0" 
              step="0.01" 
              :disabled="authStore.userRole === 'owner' || authStore.userRole === 'administrator' || paymentForm.paymentMethodId === '90000000-0000-0000-0000-000000000005'" 
              class="w-full saas-input font-bold font-mono text-emerald-500 text-sm disabled:opacity-80" 
            />
          </div>

          <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end">
            <button 
              type="button" 
              @click="showRegisterPaymentModal = false"
              class="bg-neutral-900 hover:bg-neutral-850 text-white py-2 px-4 rounded-xl font-bold transition-all cursor-pointer border border-gray-800"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-5 rounded-xl font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Procesando...' : 'Registrar Cobro' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: ASIGNAR / RENOVAR PLAN -->
    <div v-if="showRenewPlanModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 my-8">
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-900">
          <h4 class="saas-title">Contratar / Renovar Plan</h4>
          <button @click="showRenewPlanModal = false" class="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <form @submit.prevent="handleRenewPlan" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Seleccione Plan de Membresía</label>
            <select 
              v-model="renewPlanForm.planId" 
              required
              class="w-full saas-select"
            >
              <option v-for="plan in memberStore.plans" :key="plan.id" :value="plan.id">
                {{ plan.name }} — ${{ plan.price / 100 }} MXN ({{ plan.durationDays }} días)
              </option>
            </select>
          </div>

          <div v-if="selectedPlanDetails?.isGroup && numBeneficiariesNeeded > 0" class="space-y-3 animate-in slide-in-from-top-1 duration-150 border-t border-gray-900 pt-3">
            <h5 class="font-bold text-[#10B981] uppercase tracking-wide text-[10px]">Socios Beneficiarios del Plan</h5>
            <div v-for="index in numBeneficiariesNeeded" :key="index">
              <label class="block font-semibold text-neutral-400 mb-1">Socio Adicional {{ index }}</label>
              <select 
                v-model="renewPlanForm.beneficiaryIds[index - 1]" 
                required
                class="w-full saas-select"
              >
                <option value="" disabled>Seleccione socio...</option>
                <option v-for="m in eligibleBeneficiaries" :key="m.id" :value="m.id">
                  {{ m.firstName }} {{ m.lastName }} ({{ m.memberNumber }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha de Inicio (Opcional - Socios Antiguos)</label>
            <input 
              v-model="renewPlanForm.startDate" 
              type="date"
              class="w-full saas-input"
            />
          </div>

          <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end">
            <button 
              type="button" 
              @click="showRenewPlanModal = false"
              class="bg-neutral-900 hover:bg-neutral-850 text-white py-2 px-4 rounded-xl font-bold transition-all cursor-pointer border border-gray-800"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="bg-[#F59E0B] hover:bg-[#d97706] text-black py-2 px-5 rounded-xl font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Procesando...' : 'Asignar Plan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: AUDITAR MEMBRESÍA EN HISTORIAL -->
    <div v-if="showEditMembershipModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 my-8">
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-900">
          <h4 class="saas-title">Auditar Membresía Contratada</h4>
          <button @click="showEditMembershipModal = false" class="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <form @submit.prevent="handleSaveMembership" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Plan Relacionado</label>
            <select 
              v-model="membershipForm.planId" 
              required
              class="w-full saas-select"
            >
              <option v-for="plan in memberStore.plans" :key="plan.id" :value="plan.id">
                {{ plan.name }} (${{ plan.price / 100 }} MXN)
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha de Inicio</label>
              <input v-model="membershipForm.startDate" type="date" required class="w-full saas-input" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha de Fin</label>
              <input v-model="membershipForm.endDate" type="date" required class="w-full saas-input" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Estatus</label>
            <select v-model="membershipForm.status" required class="w-full saas-select">
              <option value="PENDING">PENDIENTE</option>
              <option value="ACTIVE">ACTIVA</option>
              <option value="CANCELLED">CANCELADA</option>
              <option value="EXPIRED">EXPIRADA</option>
            </select>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end">
            <button 
              type="button" 
              @click="showEditMembershipModal = false"
              class="bg-neutral-900 hover:bg-neutral-850 text-white py-2 px-4 rounded-xl font-bold transition-all cursor-pointer border border-gray-800"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="bg-[#F59E0B] hover:bg-[#d97706] text-black py-2 px-5 rounded-xl font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 4: CONFIRMACIÓN DE SUSPENSIÓN -->
    <div v-if="showDeactivateModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 my-8">
        <div class="space-y-2 text-left">
          <h4 class="saas-title flex items-center space-x-2 text-[#FA2F2A]">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#FA2F2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>SUSPENDER MIEMBRO</span>
          </h4>
          <p class="text-xs text-neutral-300 pt-2 leading-relaxed">
            ¿Estás seguro de que deseas desactivar/suspender al miembro <strong class="text-white font-bold">{{ memberStore.selectedMember?.firstName }} {{ memberStore.selectedMember?.lastName }}</strong>?
          </p>
          <p class="text-[11px] text-neutral-450 leading-normal">
            Esta acción revocará su estatus activo y denegará sus accesos biométricos automáticos en recepción.
          </p>
        </div>

        <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end">
          <button 
            ref="cancelBtnRef"
            type="button" 
            @click="closeDeactivateModal"
            class="bg-neutral-900 hover:bg-neutral-850 text-white py-2.5 px-6 rounded-xl font-bold transition-all border border-gray-800 text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            ref="confirmBtnRef"
            type="button"
            @click="confirmDeactivate"
            :disabled="isDeactivating"
            class="bg-[#FA2F2A] hover:bg-red-750 text-white py-2.5 px-6 rounded-xl font-bold shadow-md transition-all text-xs disabled:opacity-50 cursor-pointer"
          >
            {{ isDeactivating ? 'Suspendiendo...' : 'Sí, Suspender' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: REGISTRAR NUEVO MIEMBRO -->
    <div v-if="showAddMemberModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="bg-neutral-950 text-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative border border-neutral-900 font-sans border-t-4 border-t-[#FA2F2A] my-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-sm font-bold uppercase tracking-widest text-[#FA2F2A]">Registrar Nuevo Miembro</h3>
          <button @click="showAddMemberModal = false" class="text-neutral-400 hover:text-white cursor-pointer text-base">
            ✕
          </button>
        </div>
        
        <form @submit.prevent="saveNewMember" class="space-y-6 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre</label>
              <input v-model="memberForm.firstName" type="text" required class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Apellidos</label>
              <input v-model="memberForm.lastName" type="text" required class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Género</label>
              <select v-model="memberForm.gender" class="w-full saas-input text-sm bg-neutral-900 text-white border-neutral-800 focus:border-[#F59E0B] focus:ring-0">
                <option>Masculino</option>
                <option>Femenino</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha de Nacimiento</label>
              <input v-model="memberForm.birthDate" type="date" required class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
              <input v-model="memberForm.email" type="email" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Número de Teléfono</label>
              <input v-model="memberForm.phone" type="tel" required class="w-full saas-input text-sm" />
            </div>
          </div>

          <hr class="border-gray-900/60" />

          <h4 class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Dirección de Contacto</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Calle</label>
              <input v-model="memberForm.street" type="text" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Número</label>
              <input v-model="memberForm.number" type="text" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Ciudad</label>
              <input v-model="memberForm.city" type="text" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Estado</label>
              <input v-model="memberForm.state" type="text" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Código Postal</label>
              <input v-model="memberForm.postalCode" type="text" class="w-full saas-input text-sm" />
            </div>
          </div>

          <hr class="border-gray-900/60" />

          <h4 class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Contacto de Emergencia</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del Contacto</label>
              <input v-model="memberForm.emergencyContactName" type="text" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Teléfono de Contacto</label>
              <input v-model="memberForm.emergencyContactPhone" type="tel" class="w-full saas-input text-sm" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Parentesco / Relación</label>
              <input v-model="memberForm.emergencyContactRelationship" type="text" class="w-full saas-input text-sm" />
            </div>
          </div>

          <hr class="border-gray-900/60" />

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Observaciones</label>
            <textarea v-model="memberForm.notes" rows="2" class="w-full saas-input text-sm resize-none" placeholder="Detalles de salud, preferencias de entrenamiento, etc."></textarea>
          </div>

          <hr class="border-gray-900/60" />

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-2">Foto de Perfil</label>
            <div class="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <div class="w-32 h-32 border border-neutral-900 rounded-xl bg-neutral-950 flex items-center justify-center overflow-hidden relative">
                <video v-if="cameraActive && !capturedPhoto" ref="videoRef" autoplay playsinline class="w-full h-full object-cover"></video>
                <img v-else-if="capturedPhoto || memberForm.photoUrl" :src="capturedPhoto || memberForm.photoUrl" class="w-full h-full object-cover" />
                <div v-else class="text-neutral-500 text-[10px] text-center p-2 font-mono">SIN FOTO</div>
              </div>
              
              <div class="flex flex-col space-y-2">
                <input type="file" ref="fileInputRef" accept="image/*" class="hidden" @change="onFileChange" />
                
                <button type="button" @click="triggerFileSelect" class="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-gray-800/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Subir Archivo</span>
                </button>

                <button v-if="!cameraActive" type="button" @click="startCamera" class="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-gray-800/60">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 11-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Usar Cámara</span>
                </button>
                <div v-else class="flex space-x-2">
                  <button type="button" @click="captureSnapshot" class="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">Tomar Foto</button>
                  <button type="button" @click="stopCamera" class="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-850">Cancelar</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Owner only: no payment required toggle -->
          <div v-if="authStore.userRole === 'owner'" class="border-t border-gray-900/60 pt-4 flex items-center justify-between">
            <div>
              <label class="block font-bold text-neutral-300 uppercase tracking-wider text-[10px]">No requiere pago</label>
              <p class="text-[9px] text-neutral-500">Activa automáticamente las nuevas membresías sin requerir un pago registrado.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input v-model="memberForm.noPaymentRequired" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-neutral-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 peer-checked:after:bg-[#F59E0B] after:border-gray-305 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F59E0B]/20 border border-gray-800"></div>
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-900/60">
            <button @click="showAddMemberModal = false" type="button" class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-800/60">Cancelar</button>
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2.5 bg-[#FA2F2A] hover:bg-[#d6201b] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar Perfil' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE ENROLAMIENTO BIOMÉTRICO (NUEVO) -->
    <div v-if="showEnrollModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start">
      <div class="saas-card-elevated max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 my-8">
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-900">
          <h4 class="saas-title">Enrolar Huella Dactilar</h4>
          <button @click="closeEnrollModal" class="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="p-4 bg-neutral-950 border border-gray-900 rounded-xl space-y-2">
            <div class="flex justify-between text-neutral-450 font-mono text-[10px]">
              <span>Dedo a registrar:</span>
              <span class="text-white font-bold">{{ fingerNames[enrollFingerIndex] }}</span>
            </div>
            <div class="flex justify-between text-neutral-450 font-mono text-[10px]">
              <span>Miembro:</span>
              <span class="text-white font-bold">{{ memberStore.selectedMember?.firstName }} {{ memberStore.selectedMember?.lastName }}</span>
            </div>
          </div>

          <!-- Connection / Scan Status Indicator -->
          <div class="p-6 border border-gray-900 bg-[#0A0A0A] rounded-xl flex flex-col items-center justify-center space-y-4 min-h-[160px]">
            <div class="relative flex items-center justify-center">
              <div 
                v-if="enrollStep === 'waiting_agent'" 
                class="w-12 h-12 rounded-full bg-red-950/20 text-[#FA2F2A] border border-red-900/30 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div 
                v-else-if="enrollStep === 'ready' || enrollStep === 'step_1' || enrollStep === 'step_2' || enrollStep === 'step_3'" 
                class="w-12 h-12 rounded-full bg-amber-950/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a13.917 13.917 0 00-2.338-7.794M21 12c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09a13.916 13.916 0 002.002-7.643 13.916 13.916 0 00-2.338-7.794M12 11c0-1.11-.274-2.158-.758-3.08a9.96 9.96 0 011.516-3.896M12 11c0 1.11-.274 2.158-.758 3.08M12 3a9.96 9.96 0 00-3.243.539M9 21a9.96 9.96 0 003.243-.539M9 21c-1.11 0-2.158-.274-3.08-.758M9 21a9.96 9.96 0 003.243-.539M9 3a9.96 9.96 0 013.08.758M6.079 5.243A9.967 9.967 0 019 4.08M6.079 18.757A9.967 9.967 0 019 19.92" />
                </svg>
              </div>
              <div 
                v-else-if="enrollStep === 'success'" 
                class="w-12 h-12 rounded-full bg-emerald-950/20 text-[#10B981] border border-emerald-900/30 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div 
                v-else-if="enrollStep === 'error'" 
                class="w-12 h-12 rounded-full bg-red-950/20 text-[#FA2F2A] border border-red-900/30 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <!-- Descriptive Text -->
            <div class="text-center space-y-1.5 px-4 font-sans">
              <h5 class="font-bold text-white uppercase tracking-wider text-[10px]">
                <span v-if="enrollStep === 'waiting_agent'">Agente no detectado</span>
                <span v-else-if="enrollStep === 'ready'">Lector Listo</span>
                <span v-else-if="enrollStep === 'step_1'">Coloque el dedo (1 / 3)</span>
                <span v-else-if="enrollStep === 'step_2'">Coloque el dedo (2 / 3)</span>
                <span v-else-if="enrollStep === 'step_3'">Coloque el dedo (3 / 3)</span>
                <span v-else-if="enrollStep === 'success'">¡Registro Exitoso!</span>
                <span v-else-if="enrollStep === 'error'">Error de Escaneo</span>
              </h5>
              <p class="text-neutral-450 text-[10px] leading-relaxed">
                <span v-if="enrollStep === 'waiting_agent'">
                  No se pudo establecer comunicación con el lector en <code>ws://localhost:9000</code>. Asegúrese de que el Agente de Escritorio esté ejecutándose.
                </span>
                <span v-else-if="enrollStep === 'ready'">
                  Coloque el dedo seleccionado en el cristal del escáner ZK9500 para comenzar la captura.
                </span>
                <span v-else-if="enrollStep === 'step_1'">
                  Retire y vuelva a colocar el dedo para realizar la segunda lectura.
                </span>
                <span v-else-if="enrollStep === 'step_2'">
                  Retire y vuelva a colocar el dedo para realizar la tercera lectura final.
                </span>
                <span v-else-if="enrollStep === 'step_3'">
                  Procesando y unificando el patrón minutiae dactilar...
                </span>
                <span v-else-if="enrollStep === 'success'">
                  La huella se ha fusionado y asociado al miembro correctamente en el servidor.
                </span>
                <span v-else-if="enrollStep === 'error'">
                  {{ enrollErrorMsg || 'La lectura falló. Intente colocar el dedo de forma firme y centrada.' }}
                </span>
              </p>
            </div>
          </div>

          <!-- Dev Mode Simulator Panel -->
          <div v-if="enrollStep === 'waiting_agent' || enrollStep === 'error'" class="p-4 bg-neutral-950 border border-dashed border-gray-900 rounded-xl space-y-3 font-sans">
            <div class="flex justify-between items-center">
              <div>
                <h6 class="text-[10px] font-bold text-neutral-300 uppercase tracking-wide">Modo de Demostración (Simulador)</h6>
                <p class="text-[9px] text-neutral-500">¿No tiene un lector físico conectado?</p>
              </div>
              <button 
                type="button" 
                @click="triggerSimulatedEnrollment"
                class="px-2.5 py-1.5 bg-[#F59E0B] text-black font-bold text-[9px] uppercase rounded-lg hover:bg-[#d97706] transition-all cursor-pointer shadow-sm"
              >
                Simular Escaneo
              </button>
            </div>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-gray-900 justify-end font-sans">
            <button 
              type="button" 
              @click="closeEnrollModal"
              class="bg-neutral-900 hover:bg-neutral-850 text-white py-2 px-4 rounded-xl font-bold transition-all cursor-pointer border border-gray-800"
            >
              {{ enrollStep === 'success' ? 'Listo' : 'Cancelar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TOAST NOTIFICACIÓN -->
    <div 
      v-if="showToast" 
      class="fixed bottom-6 right-6 bg-[#0A0A0A] border border-gray-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans text-xs border-l-4 border-l-[#F59E0B]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ toastMessage }}</span>
    </div>

  </div>
</template>

<style scoped>
.saas-card {
  background-color: #0A0A0A !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
  border-radius: 16px !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.6) !important;
}
.saas-card:hover {
  border-color: rgba(245, 158, 11, 0.25) !important;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.8) !important;
}
.saas-card-elevated {
  background-color: #121212 !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.9) !important;
}
.saas-label {
  color: #888888 !important; /* Muted gray label */
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}
.saas-value {
  color: #FFFFFF !important; /* High contrast white */
  font-size: 13px !important;
  font-weight: 600 !important;
}
.saas-title {
  font-size: 14px !important;
  font-weight: 750 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: #F59E0B !important; /* Accent gold */
}

/* Form controls overrides */
.saas-input, .saas-select {
  background-color: #121212 !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  padding: 0.55rem 0.8rem !important;
  font-size: 12.5px !important;
  transition: all 0.2s ease;
  width: 100%;
}
.saas-input:focus, .saas-select:focus {
  outline: none !important;
  border-color: #F59E0B !important;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15) !important;
}
.saas-input-with-icon {
  padding-left: 2.3rem !important;
}

/* Custom button overrides */
.bg-neutral-900 {
  background-color: #121212 !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}
.bg-neutral-900:hover {
  background-color: #1A1A1A !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}
.bg-neutral-850 {
  background-color: #1A1A1A !important;
  color: #FFFFFF !important;
}
.bg-neutral-850:hover {
  background-color: #222222 !important;
}
</style>
