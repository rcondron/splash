import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('VoyagesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdVoyageId: string;
  let testUserId: string;
  let testCompanyId: string;

  const timestamp = Date.now();

  const testUser = {
    email: `e2e-voyages-${timestamp}@test.com`,
    password: 'TestPassword123!',
    firstName: 'Voyage',
    lastName: 'Tester',
    companyName: 'Voyage Test Corp',
    companyType: 'CHARTERER',
  };

  const createVoyageDto = {
    voyageName: `Test Voyage ${timestamp}`,
    internalReference: `TV-${timestamp}`,
    vesselName: 'MV Test Runner',
    cargoType: 'Wheat',
    cargoQuantity: '50000 MT',
    loadPort: 'Rotterdam',
    dischargePort: 'Singapore',
    freightRate: '15.50',
    freightCurrency: 'USD',
    rateBasis: 'per MT',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Register and login to get a valid token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    accessToken = registerRes.body.accessToken;
    testUserId = registerRes.body.user.id;
    testCompanyId = registerRes.body.company.id;
  });

  afterAll(async () => {
    // Clean up in dependency order
    if (createdVoyageId) {
      await prisma.voyageParticipant.deleteMany({
        where: { voyageId: createdVoyageId },
      });
      await prisma.auditEvent.deleteMany({
        where: { voyageId: createdVoyageId },
      });
      await prisma.voyage.deleteMany({ where: { id: createdVoyageId } });
    }
    if (testUserId) {
      await prisma.voyageParticipant.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.auditEvent.deleteMany({
        where: { actorUserId: testUserId },
      });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    if (testCompanyId) {
      // Clean any remaining voyages for this company
      const remainingVoyages = await prisma.voyage.findMany({
        where: { companyId: testCompanyId },
      });
      for (const v of remainingVoyages) {
        await prisma.voyageParticipant.deleteMany({
          where: { voyageId: v.id },
        });
        await prisma.auditEvent.deleteMany({ where: { voyageId: v.id } });
      }
      await prisma.voyage.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.company.deleteMany({ where: { id: testCompanyId } });
    }
    await app.close();
  });

  describe('POST /voyages', () => {
    it('should create a new voyage', async () => {
      const res = await request(app.getHttpServer())
        .post('/voyages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createVoyageDto)
        .expect(201);

      createdVoyageId = res.body.id;

      expect(res.body).toHaveProperty('id');
      expect(res.body.voyageName).toBe(createVoyageDto.voyageName);
      expect(res.body.internalReference).toBe(createVoyageDto.internalReference);
      expect(res.body.vesselName).toBe(createVoyageDto.vesselName);
      expect(res.body.cargoType).toBe(createVoyageDto.cargoType);
      expect(res.body.loadPort).toBe(createVoyageDto.loadPort);
      expect(res.body.dischargePort).toBe(createVoyageDto.dischargePort);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.companyId).toBe(testCompanyId);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/voyages')
        .send(createVoyageDto)
        .expect(401);
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/voyages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ vesselName: 'Only vessel, no name or reference' })
        .expect(400);
    });
  });

  describe('GET /voyages', () => {
    it('should list voyages for the authenticated company', async () => {
      const res = await request(app.getHttpServer())
        .get('/voyages')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('totalPages');

      const found = res.body.data.find(
        (v: any) => v.id === createdVoyageId,
      );
      expect(found).toBeDefined();
      expect(found.voyageName).toBe(createVoyageDto.voyageName);
    });

    it('should filter voyages by search query', async () => {
      const res = await request(app.getHttpServer())
        .get('/voyages')
        .query({ search: createVoyageDto.vesselName })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find(
        (v: any) => v.id === createdVoyageId,
      );
      expect(found).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/voyages')
        .expect(401);
    });
  });

  describe('GET /voyages/:id', () => {
    it('should return voyage detail by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/voyages/${createdVoyageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdVoyageId);
      expect(res.body.voyageName).toBe(createVoyageDto.voyageName);
      expect(res.body).toHaveProperty('createdBy');
      expect(res.body).toHaveProperty('company');
      expect(res.body).toHaveProperty('participants');
      expect(res.body).toHaveProperty('_count');
    });

    it('should return 404 for non-existent voyage', async () => {
      await request(app.getHttpServer())
        .get('/voyages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /voyages/:id', () => {
    it('should update an existing voyage', async () => {
      const updateDto = {
        vesselName: 'MV Updated Runner',
        cargoType: 'Corn',
        status: 'NEGOTIATION',
      };

      const res = await request(app.getHttpServer())
        .patch(`/voyages/${createdVoyageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(res.body.id).toBe(createdVoyageId);
      expect(res.body.vesselName).toBe(updateDto.vesselName);
      expect(res.body.cargoType).toBe(updateDto.cargoType);
      expect(res.body.status).toBe(updateDto.status);
      // Fields not sent should remain unchanged
      expect(res.body.loadPort).toBe(createVoyageDto.loadPort);
    });

    it('should return 404 for non-existent voyage', async () => {
      await request(app.getHttpServer())
        .patch('/voyages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ vesselName: 'Ghost Ship' })
        .expect(404);
    });
  });

  describe('DELETE /voyages/:id (archive)', () => {
    it('should archive the voyage', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/voyages/${createdVoyageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('ARCHIVED');
    });
  });
});
