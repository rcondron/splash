import { PrismaClient, CompanyType, UserRole, VoyageStatus, ParticipantRole, ConversationType, MessageType, MessageSource, TermType, ExtractionStatus, ProposedBy, GeneratedBy } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.contractDraft.deleteMany();
  await prisma.recap.deleteMany();
  await prisma.dealSnapshot.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.importedEmail.deleteMany();
  await prisma.emailIntegrationAccount.deleteMany();
  await prisma.extractedTerm.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.voyageParticipant.deleteMany();
  await prisma.voyage.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log('Seeding companies...');
  const hash = bcrypt.hashSync('password123', 10);

  const oceanic = await prisma.company.create({
    data: { legalName: 'Oceanic Shipping Ltd', displayName: 'Oceanic Shipping', companyType: CompanyType.OWNER },
  });
  const globalCh = await prisma.company.create({
    data: { legalName: 'Global Chartering Partners', displayName: 'Global Chartering', companyType: CompanyType.CHARTERER },
  });
  const maritime = await prisma.company.create({
    data: { legalName: 'Maritime Brokerage International', displayName: 'Maritime Brokerage', companyType: CompanyType.BROKER },
  });

  console.log('Seeding users...');
  const john = await prisma.user.create({ data: { firstName: 'John', lastName: 'Mitchell', email: 'john@oceanic-shipping.com', passwordHash: hash, companyId: oceanic.id, role: UserRole.COMPANY_ADMIN, jobTitle: 'Head of Chartering' } });
  const sarah = await prisma.user.create({ data: { firstName: 'Sarah', lastName: 'Chen', email: 'sarah@oceanic-shipping.com', passwordHash: hash, companyId: oceanic.id, role: UserRole.OWNER, jobTitle: 'Fleet Manager' } });
  const david = await prisma.user.create({ data: { firstName: 'David', lastName: 'Rodriguez', email: 'david@oceanic-shipping.com', passwordHash: hash, companyId: oceanic.id, role: UserRole.OPERATOR, jobTitle: 'Operations Manager' } });
  const emily = await prisma.user.create({ data: { firstName: 'Emily', lastName: 'Thompson', email: 'emily@globalchartering.com', passwordHash: hash, companyId: globalCh.id, role: UserRole.COMPANY_ADMIN, jobTitle: 'Chartering Director' } });
  const michael = await prisma.user.create({ data: { firstName: 'Michael', lastName: 'Petrov', email: 'michael@globalchartering.com', passwordHash: hash, companyId: globalCh.id, role: UserRole.CHARTERER, jobTitle: 'Senior Charterer' } });
  const lisa = await prisma.user.create({ data: { firstName: 'Lisa', lastName: 'Yamamoto', email: 'lisa@globalchartering.com', passwordHash: hash, companyId: globalCh.id, role: UserRole.CHARTERER, jobTitle: 'Charterer' } });
  const james = await prisma.user.create({ data: { firstName: 'James', lastName: "O'Brien", email: 'james@maritimebrokerage.com', passwordHash: hash, companyId: maritime.id, role: UserRole.COMPANY_ADMIN, jobTitle: 'Managing Director' } });
  const anna = await prisma.user.create({ data: { firstName: 'Anna', lastName: 'Kowalski', email: 'anna@maritimebrokerage.com', passwordHash: hash, companyId: maritime.id, role: UserRole.BROKER, jobTitle: 'Senior Broker' } });
  const robert = await prisma.user.create({ data: { firstName: 'Robert', lastName: 'Singh', email: 'robert@maritimebrokerage.com', passwordHash: hash, companyId: maritime.id, role: UserRole.BROKER, jobTitle: 'Broker' } });
  const maria = await prisma.user.create({ data: { firstName: 'Maria', lastName: 'Santos', email: 'maria@maritimebrokerage.com', passwordHash: hash, companyId: maritime.id, role: UserRole.LEGAL, jobTitle: 'Legal Counsel' } });

  console.log('Seeding voyages...');
  const v1 = await prisma.voyage.create({ data: {
    voyageName: 'MV Pacific Voyager - Santos to Rotterdam', internalReference: 'VOY-2026-001', vesselName: 'MV Pacific Voyager', imoNumber: '9876543',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners', brokerCompanyName: 'Maritime Brokerage International',
    cargoType: 'Iron Ore', cargoQuantity: '75,000 MT', loadPort: 'Santos, Brazil', dischargePort: 'Rotterdam, Netherlands',
    laycanStart: new Date('2026-04-15'), laycanEnd: new Date('2026-04-20'), freightRate: '18.50', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.NEGOTIATING, companyId: oceanic.id, createdByUserId: john.id,
  }});
  const v2 = await prisma.voyage.create({ data: {
    voyageName: 'MV Nordic Spirit - US Gulf to Japan', internalReference: 'VOY-2026-002', vesselName: 'MV Nordic Spirit', imoNumber: '9876544',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners', brokerCompanyName: 'Maritime Brokerage International',
    cargoType: 'Grain (Soybeans)', cargoQuantity: '60,000 MT', loadPort: 'Houston, USA', dischargePort: 'Kashima, Japan',
    laycanStart: new Date('2026-04-25'), laycanEnd: new Date('2026-04-30'), freightRate: '42.00', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.FIXED, companyId: oceanic.id, createdByUserId: john.id,
  }});
  const v3 = await prisma.voyage.create({ data: {
    voyageName: 'MV Eastern Promise - AG to India', internalReference: 'VOY-2026-003', vesselName: 'MV Eastern Promise', imoNumber: '9876545',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners',
    cargoType: 'Crude Oil', cargoQuantity: '130,000 MT', loadPort: 'Ras Tanura, Saudi Arabia', dischargePort: 'Mundra, India',
    laycanStart: new Date('2026-03-10'), laycanEnd: new Date('2026-03-15'), freightRate: 'WS 65', freightCurrency: 'USD', rateBasis: 'Worldscale',
    status: VoyageStatus.PERFORMING, companyId: oceanic.id, createdByUserId: sarah.id,
  }});
  const v4 = await prisma.voyage.create({ data: {
    voyageName: 'MV Atlantic Courage - ECSA to China', internalReference: 'VOY-2026-004', vesselName: 'MV Atlantic Courage', imoNumber: '9876546',
    cargoType: 'Coal', cargoQuantity: '82,000 MT', loadPort: 'Richards Bay, South Africa', dischargePort: 'Qingdao, China',
    laycanStart: new Date('2026-05-05'), laycanEnd: new Date('2026-05-12'),
    status: VoyageStatus.DRAFT, companyId: oceanic.id, createdByUserId: john.id,
  }});
  const v5 = await prisma.voyage.create({ data: {
    voyageName: 'MV Mediterranean Star - Black Sea to Egypt', internalReference: 'VOY-2026-005', vesselName: 'MV Mediterranean Star', imoNumber: '9876547',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners', brokerCompanyName: 'Maritime Brokerage International',
    cargoType: 'Wheat', cargoQuantity: '30,000 MT', loadPort: 'Constanta, Romania', dischargePort: 'Alexandria, Egypt',
    laycanStart: new Date('2026-04-08'), laycanEnd: new Date('2026-04-12'), freightRate: '28.00', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.NEGOTIATING, companyId: globalCh.id, createdByUserId: emily.id,
  }});
  const v6 = await prisma.voyage.create({ data: {
    voyageName: 'MV Indian Ocean Trader - Indonesia to India', internalReference: 'VOY-2026-006', vesselName: 'MV Indian Ocean Trader', imoNumber: '9876548',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners',
    cargoType: 'Palm Oil', cargoQuantity: '45,000 MT', loadPort: 'Dumai, Indonesia', dischargePort: 'Kandla, India',
    laycanStart: new Date('2026-02-01'), laycanEnd: new Date('2026-02-05'), freightRate: '35.50', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.COMPLETED, companyId: oceanic.id, createdByUserId: sarah.id,
  }});
  const v7 = await prisma.voyage.create({ data: {
    voyageName: 'MV Caribbean Dawn - USEC to ARAG', internalReference: 'VOY-2026-007', vesselName: 'MV Caribbean Dawn', imoNumber: '9876549',
    ownerCompanyName: 'Oceanic Shipping Ltd', chartererCompanyName: 'Global Chartering Partners', brokerCompanyName: 'Maritime Brokerage International',
    cargoType: 'Pet Coke', cargoQuantity: '55,000 MT', loadPort: 'Baltimore, USA', dischargePort: 'Amsterdam, Netherlands',
    laycanStart: new Date('2026-04-18'), laycanEnd: new Date('2026-04-22'), freightRate: '22.00', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.FIXED, companyId: globalCh.id, createdByUserId: emily.id,
  }});
  const v8 = await prisma.voyage.create({ data: {
    voyageName: 'MV Caspian Explorer - Med to W Africa', internalReference: 'VOY-2026-008', vesselName: 'MV Caspian Explorer', imoNumber: '9876550',
    cargoType: 'Cement', cargoQuantity: '25,000 MT', loadPort: 'Mersin, Turkey', dischargePort: 'Lagos, Nigeria',
    laycanStart: new Date('2026-01-10'), laycanEnd: new Date('2026-01-15'), freightRate: '31.00', freightCurrency: 'USD', rateBasis: 'per MT',
    status: VoyageStatus.ARCHIVED, companyId: maritime.id, createdByUserId: james.id,
  }});

  console.log('Seeding participants...');
  const participants = [
    { voyageId: v1.id, userId: john.id, role: ParticipantRole.OWNER },
    { voyageId: v1.id, userId: sarah.id, role: ParticipantRole.OWNER },
    { voyageId: v1.id, userId: michael.id, role: ParticipantRole.CHARTERER },
    { voyageId: v1.id, userId: anna.id, role: ParticipantRole.BROKER },
    { voyageId: v1.id, userId: emily.id, role: ParticipantRole.CHARTERER },
    { voyageId: v2.id, userId: john.id, role: ParticipantRole.OWNER },
    { voyageId: v2.id, userId: michael.id, role: ParticipantRole.CHARTERER },
    { voyageId: v2.id, userId: anna.id, role: ParticipantRole.BROKER },
    { voyageId: v2.id, userId: david.id, role: ParticipantRole.OPERATOR },
    { voyageId: v3.id, userId: sarah.id, role: ParticipantRole.OWNER },
    { voyageId: v3.id, userId: lisa.id, role: ParticipantRole.CHARTERER },
    { voyageId: v3.id, userId: robert.id, role: ParticipantRole.BROKER },
    { voyageId: v4.id, userId: john.id, role: ParticipantRole.ADMIN },
    { voyageId: v5.id, userId: emily.id, role: ParticipantRole.CHARTERER },
    { voyageId: v5.id, userId: michael.id, role: ParticipantRole.CHARTERER },
    { voyageId: v5.id, userId: anna.id, role: ParticipantRole.BROKER },
    { voyageId: v5.id, userId: sarah.id, role: ParticipantRole.OWNER },
    { voyageId: v6.id, userId: sarah.id, role: ParticipantRole.OWNER },
    { voyageId: v6.id, userId: lisa.id, role: ParticipantRole.CHARTERER },
    { voyageId: v7.id, userId: emily.id, role: ParticipantRole.CHARTERER },
    { voyageId: v7.id, userId: robert.id, role: ParticipantRole.BROKER },
    { voyageId: v7.id, userId: john.id, role: ParticipantRole.OWNER },
    { voyageId: v8.id, userId: james.id, role: ParticipantRole.ADMIN },
    { voyageId: v8.id, userId: anna.id, role: ParticipantRole.BROKER },
  ];
  for (const p of participants) {
    await prisma.voyageParticipant.create({ data: p });
  }

  console.log('Seeding conversations and messages...');
  // Voyage 1 conversations
  const v1main = await prisma.conversation.create({ data: { voyageId: v1.id, type: ConversationType.NEGOTIATION, title: 'Main Negotiation', createdByUserId: anna.id } });
  const v1internal = await prisma.conversation.create({ data: { voyageId: v1.id, type: ConversationType.INTERNAL, title: 'Internal Notes - Owners', createdByUserId: john.id } });

  const v1msgs = [
    { conversationId: v1main.id, authorUserId: anna.id, plainTextBody: 'We have MV Pacific Voyager open in Santos around April 15. 75,000 MT deadweight, suitable for iron ore. Interested in hearing your requirements for the Rotterdam run.', sentAt: new Date('2026-03-20T09:00:00Z') },
    { conversationId: v1main.id, authorUserId: michael.id, plainTextBody: 'Thanks Anna. We are looking for 65-70,000 MT iron ore, laycan 15-20 April. What rate are you thinking?', sentAt: new Date('2026-03-20T09:45:00Z') },
    { conversationId: v1main.id, authorUserId: anna.id, plainTextBody: 'Owners are indicating USD 19.50/MT for the Santos-Rotterdam leg, basis 65,000 MT, 10% MOLOO.', sentAt: new Date('2026-03-20T10:30:00Z') },
    { conversationId: v1main.id, authorUserId: michael.id, plainTextBody: 'That is above our budget. We were thinking more in the range of USD 17.50-18.00. Can we discuss demurrage terms?', sentAt: new Date('2026-03-20T11:15:00Z') },
    { conversationId: v1main.id, authorUserId: john.id, plainTextBody: 'We can consider USD 18.50 if charterers agree to 4 days combined laytime, USD 25,000/day demurrage.', sentAt: new Date('2026-03-20T14:00:00Z') },
    { conversationId: v1main.id, authorUserId: michael.id, plainTextBody: 'Let me check with my principals. What about the CP form? We would prefer GENCON 94.', sentAt: new Date('2026-03-20T15:30:00Z') },
    { conversationId: v1main.id, authorUserId: anna.id, plainTextBody: 'Owners can work with GENCON 94. Commission 3.75% total - 2.5% address, 1.25% brokerage.', sentAt: new Date('2026-03-20T16:00:00Z') },
    { conversationId: v1main.id, authorUserId: emily.id, plainTextBody: 'We can accept USD 18.50 basis GENCON 94 with the following: 5 days combined laytime, USD 22,000 demurrage, half despatch on laytime saved.', sentAt: new Date('2026-03-21T08:30:00Z') },
    { conversationId: v1main.id, authorUserId: john.id, plainTextBody: 'Owners counter: 4.5 days laytime, USD 24,000 demurrage, half despatch. Payment 5 banking days after completion of discharge.', sentAt: new Date('2026-03-21T10:00:00Z') },
    { conversationId: v1main.id, authorUserId: michael.id, plainTextBody: 'We are close. Let me revert shortly with charterers final position.', sentAt: new Date('2026-03-21T11:00:00Z') },
    { conversationId: v1main.id, authorUserId: anna.id, plainTextBody: 'Also noting vessel particulars: Pacific Voyager, flag Panama, built 2019, 82,000 DWT, LOA 229m. Class NK.', sentAt: new Date('2026-03-21T11:30:00Z') },
    { conversationId: v1main.id, authorUserId: michael.id, plainTextBody: 'Charterers can accept 4.5 days laytime and USD 24,000 demurrage. Can we do payment 10 banking days? Also need vessel to pass vetting.', sentAt: new Date('2026-03-21T14:00:00Z') },
    { conversationId: v1internal.id, authorUserId: john.id, plainTextBody: 'Vessel is currently discharging in Paranagua, should be free by April 10. We have room to go to 18.00 if needed but lets hold at 18.50.', sentAt: new Date('2026-03-20T13:00:00Z') },
    { conversationId: v1internal.id, authorUserId: sarah.id, plainTextBody: 'Agreed. Vessel vetting is all up to date - SIRE report from January. No issues expected.', sentAt: new Date('2026-03-20T13:30:00Z') },
  ];
  for (const m of v1msgs) {
    await prisma.message.create({ data: { ...m, messageType: MessageType.USER_TEXT, source: MessageSource.APP } });
  }

  // Voyage 2 conversations
  const v2main = await prisma.conversation.create({ data: { voyageId: v2.id, type: ConversationType.NEGOTIATION, title: 'Fixture Negotiation', createdByUserId: anna.id } });
  const v2msgs = [
    { conversationId: v2main.id, authorUserId: anna.id, plainTextBody: 'MV Nordic Spirit available for grain loading ex US Gulf end April. 60,000 MT capacity. Owners quoting USD 42/MT for Kashima discharge.', sentAt: new Date('2026-03-15T08:00:00Z') },
    { conversationId: v2main.id, authorUserId: michael.id, plainTextBody: 'We have a soybean parcel for Japan. 55-60,000 MT, laycan 25-30 April. USD 42 is workable. NORGRAIN form?', sentAt: new Date('2026-03-15T09:30:00Z') },
    { conversationId: v2main.id, authorUserId: john.id, plainTextBody: 'Confirmed NORGRAIN. Demurrage USD 28,000/day, laytime 6 running days SHINC. Commission 2.5% address + 1.25% brokerage.', sentAt: new Date('2026-03-15T11:00:00Z') },
    { conversationId: v2main.id, authorUserId: emily.id, plainTextBody: 'All terms agreed. Charterers confirm fixture on MV Nordic Spirit at USD 42/MT, NORGRAIN form, laycan 25-30 April Houston/Kashima.', sentAt: new Date('2026-03-15T14:00:00Z') },
    { conversationId: v2main.id, authorUserId: anna.id, plainTextBody: 'Owners confirm. Clean fixture. Recap to follow.', sentAt: new Date('2026-03-15T14:30:00Z') },
  ];
  for (const m of v2msgs) {
    await prisma.message.create({ data: { ...m, messageType: MessageType.USER_TEXT, source: MessageSource.APP } });
  }

  // Voyage 5 conversations
  const v5main = await prisma.conversation.create({ data: { voyageId: v5.id, type: ConversationType.NEGOTIATION, title: 'Wheat Cargo Negotiation', createdByUserId: robert.id } });
  const v5msgs = [
    { conversationId: v5main.id, authorUserId: robert.id, plainTextBody: 'Med Star available for Black Sea loading. Good for Handy parcels up to 35,000 MT. Any wheat cargoes?', sentAt: new Date('2026-03-25T07:00:00Z') },
    { conversationId: v5main.id, authorUserId: emily.id, plainTextBody: 'We have 30,000 MT wheat, Constanta to Alexandria, laycan 8-12 April. What rate can owners do?', sentAt: new Date('2026-03-25T08:30:00Z') },
    { conversationId: v5main.id, authorUserId: sarah.id, plainTextBody: 'Owners are looking at USD 30/MT for this route. Vessel is currently in Piraeus, easy positioning.', sentAt: new Date('2026-03-25T10:00:00Z') },
    { conversationId: v5main.id, authorUserId: emily.id, plainTextBody: 'USD 30 is high for this trade. Market is more like USD 26-27 range. Can owners reconsider?', sentAt: new Date('2026-03-25T11:30:00Z') },
    { conversationId: v5main.id, authorUserId: sarah.id, plainTextBody: 'Best owners can do is USD 28.50, considering current bunker prices and positioning costs.', sentAt: new Date('2026-03-25T14:00:00Z') },
    { conversationId: v5main.id, authorUserId: michael.id, plainTextBody: 'Charterers can work with USD 28.00 flat. SYNACOMEX form. 4 days laytime, USD 18,000 demurrage. Commission 3.75%.', sentAt: new Date('2026-03-25T16:00:00Z') },
    { conversationId: v5main.id, authorUserId: robert.id, plainTextBody: 'Owners willing to accept USD 28.00 if laytime is 3.5 days. Demurrage at USD 20,000.', sentAt: new Date('2026-03-26T08:00:00Z') },
    { conversationId: v5main.id, authorUserId: emily.id, plainTextBody: 'We are reviewing. Will revert with final position by end of day.', sentAt: new Date('2026-03-26T09:00:00Z') },
  ];
  for (const m of v5msgs) {
    await prisma.message.create({ data: { ...m, messageType: MessageType.USER_TEXT, source: MessageSource.APP } });
  }

  // Additional conversations for other voyages
  await prisma.conversation.create({ data: { voyageId: v2.id, type: ConversationType.INTERNAL, title: 'Internal - Operations', createdByUserId: david.id } });
  await prisma.conversation.create({ data: { voyageId: v3.id, type: ConversationType.NEGOTIATION, title: 'Tanker Fixture Discussion', createdByUserId: sarah.id } });
  await prisma.conversation.create({ data: { voyageId: v3.id, type: ConversationType.INTERNAL, title: 'Internal Notes', createdByUserId: sarah.id } });
  await prisma.conversation.create({ data: { voyageId: v5.id, type: ConversationType.INTERNAL, title: 'Internal - Charterer Notes', createdByUserId: emily.id } });
  await prisma.conversation.create({ data: { voyageId: v6.id, type: ConversationType.NEGOTIATION, title: 'Fixture Discussion', createdByUserId: sarah.id } });
  await prisma.conversation.create({ data: { voyageId: v7.id, type: ConversationType.NEGOTIATION, title: 'Pet Coke Fixture', createdByUserId: robert.id } });

  console.log('Seeding extracted terms...');
  // Voyage 1 terms
  const v1FreightOld = await prisma.extractedTerm.create({ data: {
    voyageId: v1.id, termType: TermType.FREIGHT_RATE, rawValue: 'USD 19.50/MT', normalizedValue: '19.50 USD/MT',
    confidenceScore: 0.95, extractionStatus: ExtractionStatus.SUPERSEDED, proposedBy: ProposedBy.AI,
  }});
  const v1FreightNew = await prisma.extractedTerm.create({ data: {
    voyageId: v1.id, termType: TermType.FREIGHT_RATE, rawValue: 'USD 18.50', normalizedValue: '18.50 USD/MT',
    confidenceScore: 0.97, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id,
  }});
  await prisma.extractedTerm.update({ where: { id: v1FreightOld.id }, data: { supersededById: v1FreightNew.id } });

  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.VESSEL, rawValue: 'MV Pacific Voyager', normalizedValue: 'MV PACIFIC VOYAGER', confidenceScore: 0.98, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.CARGO, rawValue: 'iron ore', normalizedValue: 'IRON ORE', confidenceScore: 0.97, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: michael.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.QUANTITY, rawValue: '65-70,000 MT, 10% MOLOO', normalizedValue: '65,000 MT +/- 10%', confidenceScore: 0.92, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.LOAD_PORT, rawValue: 'Santos', normalizedValue: 'SANTOS, BRAZIL', confidenceScore: 0.96, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.DISCHARGE_PORT, rawValue: 'Rotterdam', normalizedValue: 'ROTTERDAM, NETHERLANDS', confidenceScore: 0.96, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.LAYCAN, rawValue: '15-20 April', normalizedValue: '2026-04-15 / 2026-04-20', confidenceScore: 0.94, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: michael.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.DEMURRAGE, rawValue: 'USD 24,000/day', normalizedValue: '24,000 USD/DAY', confidenceScore: 0.91, extractionStatus: ExtractionStatus.PROPOSED, proposedBy: ProposedBy.AI } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.COMMISSION, rawValue: '3.75% total - 2.5% address, 1.25% brokerage', normalizedValue: '3.75% (2.5% + 1.25%)', confidenceScore: 0.93, extractionStatus: ExtractionStatus.PROPOSED, proposedBy: ProposedBy.AI } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.CP_FORM, rawValue: 'GENCON 94', normalizedValue: 'GENCON 1994', confidenceScore: 0.97, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: emily.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v1.id, termType: TermType.PAYMENT_TERMS, rawValue: 'Payment 10 banking days after completion of discharge', normalizedValue: '10 BANKING DAYS AFTER DISCHARGE', confidenceScore: 0.88, extractionStatus: ExtractionStatus.PROPOSED, proposedBy: ProposedBy.AI } });

  // Voyage 2 terms (all accepted - fixed voyage)
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.VESSEL, rawValue: 'MV Nordic Spirit', normalizedValue: 'MV NORDIC SPIRIT', confidenceScore: 0.98, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.CARGO, rawValue: 'soybeans', normalizedValue: 'SOYBEANS', confidenceScore: 0.96, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: michael.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.QUANTITY, rawValue: '55-60,000 MT', normalizedValue: '60,000 MT', confidenceScore: 0.93, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.FREIGHT_RATE, rawValue: 'USD 42/MT', normalizedValue: '42.00 USD/MT', confidenceScore: 0.97, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: emily.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.LOAD_PORT, rawValue: 'Houston', normalizedValue: 'HOUSTON, USA', confidenceScore: 0.95, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.DISCHARGE_PORT, rawValue: 'Kashima', normalizedValue: 'KASHIMA, JAPAN', confidenceScore: 0.95, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.CP_FORM, rawValue: 'NORGRAIN', normalizedValue: 'NORGRAIN', confidenceScore: 0.97, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: michael.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v2.id, termType: TermType.DEMURRAGE, rawValue: 'USD 28,000/day', normalizedValue: '28,000 USD/DAY', confidenceScore: 0.94, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: john.id } });

  // Voyage 5 terms (mixed statuses - still negotiating)
  await prisma.extractedTerm.create({ data: { voyageId: v5.id, termType: TermType.VESSEL, rawValue: 'Med Star', normalizedValue: 'MV MEDITERRANEAN STAR', confidenceScore: 0.90, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: emily.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v5.id, termType: TermType.CARGO, rawValue: 'wheat', normalizedValue: 'WHEAT', confidenceScore: 0.96, extractionStatus: ExtractionStatus.ACCEPTED, proposedBy: ProposedBy.AI, approvedByUserId: emily.id } });
  await prisma.extractedTerm.create({ data: { voyageId: v5.id, termType: TermType.FREIGHT_RATE, rawValue: 'USD 28.00', normalizedValue: '28.00 USD/MT', confidenceScore: 0.89, extractionStatus: ExtractionStatus.PROPOSED, proposedBy: ProposedBy.AI } });
  await prisma.extractedTerm.create({ data: { voyageId: v5.id, termType: TermType.DEMURRAGE, rawValue: 'USD 20,000', normalizedValue: '20,000 USD/DAY', confidenceScore: 0.85, extractionStatus: ExtractionStatus.PROPOSED, proposedBy: ProposedBy.AI } });

  console.log('Seeding recaps...');
  await prisma.recap.create({ data: {
    voyageId: v2.id, title: 'Fixture Recap v1 - MV Nordic Spirit', versionNumber: 1,
    generatedBy: GeneratedBy.AI, createdByUserId: anna.id,
    bodyMarkdown: `# Fixture Recap - MV Nordic Spirit

## Parties
- **Owners:** Oceanic Shipping Ltd
- **Charterers:** Global Chartering Partners
- **Brokers:** Maritime Brokerage International

## Vessel
- **Name:** MV Nordic Spirit
- **IMO:** 9876544
- **Type:** Bulk Carrier

## Cargo
- **Type:** Grain (Soybeans)
- **Quantity:** 60,000 MT

## Ports
- **Load Port:** Houston, USA
- **Discharge Port:** Kashima, Japan

## Dates
- **Laycan:** 25-30 April 2026

## Commercial Terms
- **Freight Rate:** USD 42.00/MT
- **Demurrage:** USD 28,000 per day pro rata
- **Laytime:** 6 running days SHINC
- **Commission:** 2.5% address + 1.25% brokerage = 3.75% total

## Charter Party
- **CP Form:** NORGRAIN

---
*Generated from accepted terms. Subject to review and confirmation by all parties.*`,
    bodyHtml: '<h1>Fixture Recap - MV Nordic Spirit</h1><p>See markdown version for details.</p>',
  }});

  await prisma.recap.create({ data: {
    voyageId: v6.id, title: 'Fixture Recap v1 - MV Indian Ocean Trader', versionNumber: 1,
    generatedBy: GeneratedBy.AI, createdByUserId: sarah.id,
    bodyMarkdown: `# Fixture Recap - MV Indian Ocean Trader

## Parties
- **Owners:** Oceanic Shipping Ltd
- **Charterers:** Global Chartering Partners

## Vessel
- **Name:** MV Indian Ocean Trader
- **IMO:** 9876548

## Cargo
- **Type:** Palm Oil
- **Quantity:** 45,000 MT

## Ports
- **Load Port:** Dumai, Indonesia
- **Discharge Port:** Kandla, India

## Dates
- **Laycan:** 1-5 February 2026

## Commercial Terms
- **Freight Rate:** USD 35.50/MT
- **Payment:** 5 banking days after B/L date

---
*Voyage completed successfully.*`,
    bodyHtml: '<h1>Fixture Recap - MV Indian Ocean Trader</h1><p>See markdown version for details.</p>',
  }});

  console.log('Seeding audit events...');
  const auditEvents = [
    { voyageId: v1.id, actorUserId: john.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v1.id, metadataJson: { voyageName: v1.voyageName } },
    { voyageId: v1.id, actorUserId: anna.id, eventType: 'MESSAGE_SENT', entityType: 'Message', entityId: v1.id, metadataJson: { conversation: 'Main Negotiation' } },
    { voyageId: v1.id, actorUserId: anna.id, eventType: 'PARTICIPANT_ADDED', entityType: 'VoyageParticipant', entityId: v1.id, metadataJson: { userId: michael.id, role: 'CHARTERER' } },
    { voyageId: v1.id, actorUserId: null, eventType: 'TERM_PROPOSED', entityType: 'ExtractedTerm', entityId: v1.id, metadataJson: { termType: 'FREIGHT_RATE', value: 'USD 19.50/MT' } },
    { voyageId: v1.id, actorUserId: john.id, eventType: 'TERM_ACCEPTED', entityType: 'ExtractedTerm', entityId: v1.id, metadataJson: { termType: 'VESSEL', value: 'MV Pacific Voyager' } },
    { voyageId: v1.id, actorUserId: john.id, eventType: 'TERM_ACCEPTED', entityType: 'ExtractedTerm', entityId: v1.id, metadataJson: { termType: 'FREIGHT_RATE', value: 'USD 18.50/MT' } },
    { voyageId: v1.id, actorUserId: michael.id, eventType: 'TERM_ACCEPTED', entityType: 'ExtractedTerm', entityId: v1.id, metadataJson: { termType: 'CARGO', value: 'Iron Ore' } },
    { voyageId: v2.id, actorUserId: john.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v2.id },
    { voyageId: v2.id, actorUserId: anna.id, eventType: 'MESSAGE_SENT', entityType: 'Message', entityId: v2.id },
    { voyageId: v2.id, actorUserId: emily.id, eventType: 'VOYAGE_STATUS_CHANGED', entityType: 'Voyage', entityId: v2.id, metadataJson: { from: 'NEGOTIATING', to: 'FIXED' } },
    { voyageId: v2.id, actorUserId: anna.id, eventType: 'RECAP_GENERATED', entityType: 'Recap', entityId: v2.id, metadataJson: { version: 1 } },
    { voyageId: v3.id, actorUserId: sarah.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v3.id },
    { voyageId: v3.id, actorUserId: sarah.id, eventType: 'VOYAGE_STATUS_CHANGED', entityType: 'Voyage', entityId: v3.id, metadataJson: { from: 'FIXED', to: 'PERFORMING' } },
    { voyageId: v4.id, actorUserId: john.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v4.id },
    { voyageId: v5.id, actorUserId: emily.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v5.id },
    { voyageId: v5.id, actorUserId: robert.id, eventType: 'MESSAGE_SENT', entityType: 'Message', entityId: v5.id },
    { voyageId: v5.id, actorUserId: emily.id, eventType: 'TERM_PROPOSED', entityType: 'ExtractedTerm', entityId: v5.id, metadataJson: { termType: 'FREIGHT_RATE', value: 'USD 28.00' } },
    { voyageId: v6.id, actorUserId: sarah.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v6.id },
    { voyageId: v6.id, actorUserId: sarah.id, eventType: 'VOYAGE_STATUS_CHANGED', entityType: 'Voyage', entityId: v6.id, metadataJson: { from: 'PERFORMING', to: 'COMPLETED' } },
    { voyageId: v6.id, actorUserId: sarah.id, eventType: 'RECAP_GENERATED', entityType: 'Recap', entityId: v6.id },
    { voyageId: v7.id, actorUserId: emily.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v7.id },
    { voyageId: v7.id, actorUserId: emily.id, eventType: 'VOYAGE_STATUS_CHANGED', entityType: 'Voyage', entityId: v7.id, metadataJson: { from: 'NEGOTIATING', to: 'FIXED' } },
    { voyageId: v8.id, actorUserId: james.id, eventType: 'VOYAGE_CREATED', entityType: 'Voyage', entityId: v8.id },
    { voyageId: v8.id, actorUserId: james.id, eventType: 'VOYAGE_STATUS_CHANGED', entityType: 'Voyage', entityId: v8.id, metadataJson: { from: 'COMPLETED', to: 'ARCHIVED' } },
    { voyageId: v1.id, actorUserId: john.id, eventType: 'FILE_UPLOADED', entityType: 'FileAttachment', entityId: v1.id, metadataJson: { filename: 'vessel_particulars.pdf' } },
  ];
  for (const e of auditEvents) {
    await prisma.auditEvent.create({ data: { ...e, metadataJson: e.metadataJson || undefined } as any });
  }

  console.log('Seeding notifications...');
  const notifications = [
    { userId: john.id, voyageId: v1.id, type: 'TERM_REVIEW', title: 'New terms need review', body: 'AI extracted 3 new terms from the Pacific Voyager negotiation that need your review.', actionUrl: '/voyages/' + v1.id },
    { userId: michael.id, voyageId: v1.id, type: 'MESSAGE', title: 'New message in Pacific Voyager', body: 'John Mitchell sent a new message in the Main Negotiation thread.', actionUrl: '/voyages/' + v1.id },
    { userId: emily.id, voyageId: v2.id, type: 'RECAP', title: 'Recap generated', body: 'A fixture recap has been generated for MV Nordic Spirit.', actionUrl: '/voyages/' + v2.id, isRead: true },
    { userId: anna.id, voyageId: v5.id, type: 'MESSAGE', title: 'New message in Mediterranean Star', body: 'Emily Thompson sent a new counter-offer for the wheat cargo.', actionUrl: '/voyages/' + v5.id },
    { userId: sarah.id, voyageId: v3.id, type: 'VOYAGE_UPDATE', title: 'Eastern Promise status update', body: 'Vessel has loaded and departed Ras Tanura. ETA Mundra in 8 days.', actionUrl: '/voyages/' + v3.id, isRead: true },
    { userId: john.id, voyageId: v4.id, type: 'VOYAGE_UPDATE', title: 'Atlantic Courage draft created', body: 'A new voyage draft has been created for the Richards Bay to Qingdao coal shipment.', actionUrl: '/voyages/' + v4.id },
    { userId: emily.id, voyageId: v5.id, type: 'TERM_REVIEW', title: 'Terms pending review', body: '2 extracted terms for Mediterranean Star need your approval.', actionUrl: '/voyages/' + v5.id },
  ];
  for (const n of notifications) {
    await prisma.notification.create({ data: n as any });
  }

  console.log('Seed completed successfully!');
  console.log('Demo accounts (all password: password123):');
  console.log('  john@oceanic-shipping.com (Owner - Company Admin)');
  console.log('  emily@globalchartering.com (Charterer - Company Admin)');
  console.log('  james@maritimebrokerage.com (Broker - Company Admin)');
  console.log('  anna@maritimebrokerage.com (Broker)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
