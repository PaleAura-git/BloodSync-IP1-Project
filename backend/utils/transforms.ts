/**
 * Response transform helpers — adapt internal DB documents to the shape
 * the frontend TypeScript types expect. Centralised here so controller
 * changes are a single-line call, not scattered conditional logic.
 */

export function transformDonor(donor: any) {
  return {
    _id: donor._id,
    userId: donor.userId,
    fullName: donor.fullName,
    phone: donor.phone,
    email: donor.email,
    bloodType: donor.bloodType,
    age: donor.age,
    weight: donor.weight,
    dateOfBirth: donor.dateOfBirth ?? null,
    lastDonationDate: donor.lastDonationDate ?? null,
    location: {
      area: donor.neighborhood ?? '',
      address: donor.address ?? '',
    },
    isAvailable: donor.availabilityStatus ?? true,
    isEligible: donor.eligibilityStatus === 'ELIGIBLE',
    eligibilityReason: donor.blockReason ?? null,
    eligibilityStatus: donor.eligibilityStatus,
    totalDonations: donor.totalDonations ?? 0,
    quizCompleted: (donor.eligibilityScore ?? 0) > 0,
    createdAt: donor.createdAt,
    updatedAt: donor.updatedAt,
  }
}

export function transformHospital(hospital: any) {
  return {
    _id: hospital._id,
    userId: hospital.userId,
    hospitalName: hospital.hospitalName,
    contactPerson: hospital.contactPerson,
    phone: hospital.phone,
    email: hospital.email,
    location: {
      area: hospital.neighborhood ?? '',
      address: hospital.address ?? '',
    },
    operatingHours: hospital.operatingHours ?? '',
    licenseNumber: hospital.licenseNumber ?? null,
    isVerified: hospital.verificationStatus ?? false,
    createdAt: hospital.createdAt,
    updatedAt: hospital.updatedAt,
  }
}

export function transformDonation(d: any) {
  const statusMap: Record<string, string> = {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }

  // donorId and hospitalId may be populated objects or raw ObjectIds
  const donor = d.donorId && typeof d.donorId === 'object' && d.donorId.fullName
    ? {
        _id: d.donorId._id,
        fullName: d.donorId.fullName,
        bloodType: d.donorId.bloodType,
        phone: d.donorId.phone,
        email: d.donorId.email,
        location: { area: d.donorId.neighborhood ?? '', address: '' },
      }
    : d.donorId

  const hospital = d.hospitalId && typeof d.hospitalId === 'object' && d.hospitalId.hospitalName
    ? {
        _id: d.hospitalId._id,
        hospitalName: d.hospitalId.hospitalName,
        location: { area: d.hospitalId.neighborhood ?? '', address: d.hospitalId.address ?? '' },
        phone: d.hospitalId.phone,
      }
    : d.hospitalId

  return {
    _id: d._id,
    donor,
    hospital,
    bloodType: d.bloodType,
    units: d.unitsDonated ?? 1,
    status: statusMap[d.status] ?? d.status?.toLowerCase() ?? 'scheduled',
    scheduledDate: d.donationDate,
    completedDate: d.confirmedAt ?? null,
    notes: d.notes ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function transformUrgentRequest(r: any) {
  const statusMap: Record<string, string> = {
    ACTIVE: 'open',
    FULFILLED: 'fulfilled',
    EXPIRED: 'expired',
  }
  const urgencyMap: Record<string, string> = {
    CRITICAL: 'critical',
    HIGH: 'urgent',
  }

  const hospital = r.hospitalId && typeof r.hospitalId === 'object' && r.hospitalId.hospitalName
    ? {
        _id: r.hospitalId._id,
        hospitalName: r.hospitalId.hospitalName,
        location: { area: r.hospitalId.neighborhood ?? '', address: r.hospitalId.address ?? '' },
        phone: r.hospitalId.phone,
      }
    : r.hospitalId

  return {
    _id: r._id,
    hospital,
    bloodType: r.bloodType,
    unitsNeeded: r.unitsNeeded,
    urgencyLevel: urgencyMap[r.urgencyLevel] ?? r.urgencyLevel?.toLowerCase() ?? 'urgent',
    notes: r.reason ?? null,
    status: statusMap[r.status] ?? r.status?.toLowerCase() ?? 'open',
    respondedDonors: r.respondedDonors ?? [],
    notifiedDonorCount: r.notifiedDonorCount ?? 0,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function transformNotification(n: any) {
  const typeMap: Record<string, string> = {
    URGENT_REQUEST: 'urgent_request',
    GENERAL: 'general',
  }

  const hospital = n.hospitalId && typeof n.hospitalId === 'object' && n.hospitalId.hospitalName
    ? {
        _id: n.hospitalId._id,
        hospitalName: n.hospitalId.hospitalName,
        location: { area: n.hospitalId.neighborhood ?? '', address: n.hospitalId.address ?? '' },
      }
    : n.hospitalId

  const derivedTitle = n.title
    || (n.notificationType === 'URGENT_REQUEST'
      ? `Urgent: ${n.bloodTypeNeeded ? n.bloodTypeNeeded + ' blood' : 'blood'} needed`
      : 'Message from hospital')

  return {
    _id: n._id,
    hospital,
    type: typeMap[n.notificationType] ?? n.notificationType?.toLowerCase() ?? 'general',
    title: derivedTitle,
    message: n.message,
    bloodTypeNeeded: n.bloodTypeNeeded ?? null,
    unitsNeeded: n.unitsNeeded ?? null,
    isRead: n.isRead ?? false,
    deliveryStatus: n.deliveryStatus,
    createdAt: n.sentAt ?? n.createdAt,
    updatedAt: n.updatedAt,
  }
}
