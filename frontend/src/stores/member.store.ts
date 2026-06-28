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

  const API_URL = 'http://localhost:3000';

  function getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async function fetchMembers(query?: string) {
    try {
      const url = query ? `${API_URL}/members/search?q=${query}` : `${API_URL}/members`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        members.value = await res.json();
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
      const memberRes = await fetch(`${API_URL}/members/${id}`, { headers: getHeaders() });
      if (memberRes.ok) {
        selectedMember.value = await memberRes.json();
      }

      // Fetch memberships
      const msRes = await fetch(`${API_URL}/memberships/member/${id}`, { headers: getHeaders() });
      if (msRes.ok) {
        activeMemberships.value = await msRes.json();
      }

      // Fetch payments
      const payRes = await fetch(`${API_URL}/payments/member/${id}`, { headers: getHeaders() });
      if (payRes.ok) {
        activePayments.value = await payRes.json();
      }
      
      // Fetch documents
      await fetchMemberDocuments(id);
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
        await fetchMembers();
        const data = await res.json();
        syncStore.registerModification('CREACION_MIEMBRO', `Miembro registrado: ${member.firstName} ${member.lastName}`);
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async function updateMember(id: string, member: any) {
    try {
      const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(member),
      });
      if (res.ok) {
        await fetchMemberDetail(id);
        await fetchMembers();
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
        selectedMember.value = null;
        await fetchMembers();
        syncStore.registerModification('DESACTIVACION_MIEMBRO', `Miembro desactivado: ${name}`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  async function assignMembership(memberId: string, planId: string, startDate?: string) {
    try {
      const member = members.value.find(m => m.id === memberId);
      const plan = plans.value.find(p => p.id === planId);
      const memberName = member ? `${member.firstName} ${member.lastName}` : memberId;
      const planName = plan ? plan.name : planId;
      
      const payload: any = { memberId, planId };
      if (startDate) {
        payload.startDate = startDate;
      }
      
      const res = await fetch(`${API_URL}/memberships/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchMemberDetail(memberId);
        const data = await res.json();
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
        await fetchMemberDetail(payment.memberId);
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
        await fetchMemberDocuments(memberId);
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
        await fetchMemberDocuments(memberId);
        syncStore.registerModification('DOCUMENTO_ELIMINADO', `Documento eliminado.`);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
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
    assignMembership,
    registerPayment,
    createPlan,
    updatePlan,
    updateMembership,
    fetchMemberDocuments,
    uploadMemberDocument,
    deleteMemberDocument,
  };
});
