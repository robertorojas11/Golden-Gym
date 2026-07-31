import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSyncStore } from './sync.store';

export const useMemberStore = defineStore('member', () => {
  const syncStore = useSyncStore();
  const members = ref<any[]>([]);
  const selectedMember = ref<any | null>(null);
  const plans = ref<any[]>([]);
  const activeMemberships = ref<any[]>([]);
  const activePayments = ref<any[]>([]);
  const selectedMemberDocuments = ref<any[]>([]);

  const avatarUrls = new Map<string, string>();

  const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

  function getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async function loadAvatar(member: any, force = false) {
    const previous = avatarUrls.get(member.id);
    if (!member.hasPhoto) {
      if (previous) URL.revokeObjectURL(previous);
      avatarUrls.delete(member.id);
      const { photoUrl, ...withoutPhoto } = member;
      return withoutPhoto;
    }
    if (previous && !force) return { ...member, photoUrl: previous };
    try {
      const response = await fetch(`${API_URL}/members/${member.id}/photo`, { headers: getHeaders() });
      if (!response.ok) return member;
      const photoUrl = URL.createObjectURL(await response.blob());
      if (previous) URL.revokeObjectURL(previous);
      avatarUrls.set(member.id, photoUrl);
      return { ...member, photoUrl };
    } catch {
      return member;
    }
  }

  async function hydrateAvatars(summaries: any[]) {
    return Promise.all(summaries.map((summary) => loadAvatar(summary)));
  }

  async function fetchMembers(query?: string) {
    try {
      const url = query ? `${API_URL}/members/search?q=${query}` : `${API_URL}/members`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        members.value = await hydrateAvatars(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch(`${API_URL}/memberships/plans`, { headers: getHeaders() });
      if (res.ok) {
        plans.value = await res.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMemberDetail(id: string) {
    try {
      const [memberRes, msRes, payRes] = await Promise.all([
        fetch(`${API_URL}/members/${id}`, { headers: getHeaders() }),
        fetch(`${API_URL}/memberships/member/${id}`, { headers: getHeaders() }),
        fetch(`${API_URL}/payments/member/${id}`, { headers: getHeaders() }),
      ]);
      if (memberRes.ok) selectedMember.value = await memberRes.json();
      if (msRes.ok) activeMemberships.value = await msRes.json();
      if (payRes.ok) activePayments.value = await payRes.json();
      selectedMemberDocuments.value = [];
    } catch (e) {
      console.error(e);
    }
  }

  async function createMember(member: any) {
    try {
      const res = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(member),
      });
      if (res.ok) {
        const data = await res.json();
        const summary = await loadAvatar({
          id: data.id, memberNumber: data.memberNumber, firstName: data.firstName, lastName: data.lastName,
          gender: data.gender, email: data.email, phone: data.phone, registrationDate: data.registrationDate,
          isActive: data.isActive, noPaymentRequired: data.noPaymentRequired, hasPhoto: !!data.photoUrl,
          activePlanId: null, activePlanName: null, hasActiveMembership: false,
        });
        members.value.unshift(summary);
        syncStore.registerModification('CREACION_MIEMBRO', `Miembro registrado: ${member.firstName} ${member.lastName}`);
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async function updateMember(id: string, member: any) {
    const photoChanged = Object.prototype.hasOwnProperty.call(member, 'photoUrl');
    try {
      const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(member),
      });
      if (res.ok) {
        const data = await res.json();
        selectedMember.value = data;
        const index = members.value.findIndex((item) => item.id === id);
        if (index >= 0) {
          const summary = { ...members.value[index], firstName: data.firstName, lastName: data.lastName,
            gender: data.gender, email: data.email, phone: data.phone, isActive: data.isActive,
            noPaymentRequired: data.noPaymentRequired, hasPhoto: !!data.photoUrl };
          members.value[index] = await loadAvatar(summary, photoChanged);
        }
        syncStore.registerModification('EDICION_MIEMBRO', `Datos actualizados de: ${member.firstName} ${member.lastName}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function deactivateMember(id: string) {
    try {
      const member = members.value.find(m => m.id === id);
      const name = member ? `${member.firstName} ${member.lastName}` : id;
      const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const index = members.value.findIndex((item) => item.id === id);
        if (index >= 0) members.value[index] = { ...members.value[index], isActive: data.isActive };
        selectedMember.value = null;
        syncStore.registerModification('DESACTIVACION_MIEMBRO', `Miembro desactivado: ${name}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function reactivateMember(id: string) {
    try {
      const member = members.value.find(m => m.id === id);
      const name = member ? `${member.firstName} ${member.lastName}` : id;
      const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const index = members.value.findIndex((item) => item.id === id);
        if (index >= 0) members.value[index] = { ...members.value[index], isActive: true };
        if (selectedMember.value?.id === id) selectedMember.value = data;
        syncStore.registerModification('REACTIVACION_MIEMBRO', `Miembro reactivado: ${name}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }


  async function assignMembership(memberId: string, planId: string, startDate?: string, additionalMemberIds?: string[]) {
    try {
      const member = members.value.find(m => m.id === memberId);
      const plan = plans.value.find(p => p.id === planId);
      const memberName = member ? `${member.firstName} ${member.lastName}` : memberId;
      const planName = plan ? plan.name : planId;
      
      const payload: any = { memberId, planId };
      if (startDate) {
        payload.startDate = startDate;
      }
      if (additionalMemberIds && additionalMemberIds.length > 0) {
        payload.additionalMemberIds = additionalMemberIds;
      }
      
      const res = await fetch(`${API_URL}/memberships/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        activeMemberships.value.unshift(data);
        syncStore.registerModification('ASIGNACION_PLAN', `Plan ${planName} asignado a ${memberName}`);
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async function registerPayment(payment: any) {
    try {
      const member = members.value.find(m => m.id === payment.memberId);
      const memberName = member ? `${member.firstName} ${member.lastName}` : payment.memberId;
      const amountMXN = payment.amount / 100;

      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payment),
      });
      if (res.ok) {
        const createdPayment = await res.json();
        activePayments.value.unshift(createdPayment);
        if (createdPayment.isFullyPaid) {
          const activated = activeMemberships.value.find((membership) =>
            membership.id === createdPayment.membershipId ||
            membership.parentMembershipId === createdPayment.membershipId,
          );
          activeMemberships.value = activeMemberships.value.map((membership) =>
            membership.id === createdPayment.membershipId ||
            membership.parentMembershipId === createdPayment.membershipId
              ? { ...membership, status: 'ACTIVE' } : membership,
          );
          const activatedMemberIds = new Set([payment.memberId, ...(activated?.beneficiaryIds || [])]);
          members.value = members.value.map((member) => activatedMemberIds.has(member.id)
            ? { ...member, hasActiveMembership: true, activePlanId: activated?.planId || null,
                activePlanName: activated?.planName || null }
            : member,
          );
        }
        syncStore.registerModification('REGISTRO_PAGO', `Pago registrado para ${memberName}: $${amountMXN.toLocaleString('es-MX')} MXN`);
        return createdPayment;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async function createPlan(planData: any) {
    try {
      const res = await fetch(`${API_URL}/memberships/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      if (res.ok) {
        await fetchPlans();
        syncStore.registerModification('CREACION_PLAN', `Plan creado: ${planData.name}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function updatePlan(id: string, planData: any) {
    try {
      const res = await fetch(`${API_URL}/memberships/plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      if (res.ok) {
        await fetchPlans();
        syncStore.registerModification('EDICION_PLAN', `Plan actualizado: ${planData.name}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function updateMembership(id: string, membershipData: any) {
    try {
      const res = await fetch(`${API_URL}/memberships/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(membershipData),
      });
      if (res.ok) {
        const data = await res.json();
        const index = activeMemberships.value.findIndex((membership) => membership.id === id);
        if (index >= 0) activeMemberships.value[index] = { ...activeMemberships.value[index], ...data };
        syncStore.registerModification('EDICION_MEMBRESIA', `Membresía modificada ID: ${id}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function fetchMemberDocuments(memberId: string) {
    try {
      const res = await fetch(`${API_URL}/members/${memberId}/documents`, { headers: getHeaders() });
      if (res.ok) {
        selectedMemberDocuments.value = await res.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function uploadMemberDocument(memberId: string, summary: string, fileData: string) {
    try {
      const res = await fetch(`${API_URL}/members/${memberId}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ summary, fileData }),
      });
      if (res.ok) {
        const document = await res.json();
        selectedMemberDocuments.value.unshift(document);
        syncStore.registerModification('DOCUMENTO_SUBIDO', `Documento '${summary}' guardado.`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function deleteMemberDocument(memberId: string, docId: string) {
    try {
      const res = await fetch(`${API_URL}/members/${memberId}/documents/${docId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        selectedMemberDocuments.value = selectedMemberDocuments.value.filter((document) => document.id !== docId);
        syncStore.registerModification('DOCUMENTO_ELIMINADO', `Documento eliminado.`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function downloadMemberDocument(memberId: string, document: any) {
    const response = await fetch(`${API_URL}/members/${memberId}/documents/${document.id}/download`, {
      headers: getHeaders(),
    });
    if (!response.ok) return false;
    const url = URL.createObjectURL(await response.blob());
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.summary}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  return {
    members,
    selectedMember,
    plans,
    activeMemberships,
    activePayments,
    selectedMemberDocuments,
    fetchMembers,
    fetchPlans,
    fetchMemberDetail,
    createMember,
    updateMember,
    deactivateMember,
    reactivateMember,
    assignMembership,
    registerPayment,
    createPlan,
    updatePlan,
    updateMembership,
    fetchMemberDocuments,
    uploadMemberDocument,
    deleteMemberDocument,
    downloadMemberDocument,
  };
});
