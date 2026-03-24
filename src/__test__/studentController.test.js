import express from 'express';
import request from 'supertest';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';

const mockService = {
    addStudent: jest.fn(),
    findStudent: jest.fn(),
    deleteStudent: jest.fn(),
    updateStudent: jest.fn(),
    addScore: jest.fn(),
    findByName: jest.fn(),
    countByNames: jest.fn(),
    findByMinScore: jest.fn()
};

jest.unstable_mockModule('../service/studentService.js', () => mockService);

const {default: studentRouter} = await import('../routes/studentRoutes.js');

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(studentRouter);
    app.use((req, res) => {
        res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
    });
    return app;
}

const app = createTestApp();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('studentController integration', () => {
    describe('POST /student', () => {
        it('returns 204 when student is added', async () => {
            mockService.addStudent.mockResolvedValue(true);

            const res = await request(app)
                .post('/student')
                .send({id: 101, name: 'Test Student', password: 'safe-pass'});

            expect(res.status).toBe(204);
            expect(res.text).toBe('');
            expect(mockService.addStudent).toHaveBeenCalledWith({
                id: 101,
                name: 'Test Student',
                password: 'safe-pass'
            });
        });

        it('returns 409 when student already exists', async () => {
            mockService.addStudent.mockResolvedValue(false);

            const res = await request(app)
                .post('/student')
                .send({id: 102, name: 'Duplicate', password: 'safe-pass'});

            expect(res.status).toBe(409);
        });

        it('returns 400 when required field is missing', async () => {
            const res = await request(app)
                .post('/student')
                .send({id: 103, name: 'No Password'});

            expect(res.status).toBe(400);
            expect(res.text).toContain('password');
            expect(mockService.addStudent).not.toHaveBeenCalled();
        });

        it('returns 400 for invalid data format', async () => {
            const res = await request(app)
                .post('/student')
                .send({id: 'bad-id', name: 'Wrong Type', password: 'safe-pass'});

            expect(res.status).toBe(400);
            expect(res.text).toContain('id');
            expect(mockService.addStudent).not.toHaveBeenCalled();
        });
    });

    describe('GET /student/:id', () => {
        it('returns 200 and student body when found', async () => {
            const student = {_id: 201, name: 'Alice'};
            mockService.findStudent.mockResolvedValue(student);

            const res = await request(app).get('/student/201');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(student);
            expect(mockService.findStudent).toHaveBeenCalledWith(201);
        });

        it('returns 404 when student is not found', async () => {
            mockService.findStudent.mockResolvedValue(null);

            const res = await request(app).get('/student/999');

            expect(res.status).toBe(404);
        });

        it('passes NaN for invalid id format', async () => {
            mockService.findStudent.mockResolvedValue(null);

            const res = await request(app).get('/student/not-a-number');

            expect(res.status).toBe(404);
            expect(mockService.findStudent).toHaveBeenCalledWith(Number.NaN);
        });
    });

    describe('DELETE /student/:id', () => {
        it('returns 200 and deleted student body', async () => {
            const deleted = {_id: 301, name: 'Delete Me'};
            mockService.deleteStudent.mockResolvedValue(deleted);

            const res = await request(app).delete('/student/301');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(deleted);
            expect(mockService.deleteStudent).toHaveBeenCalledWith(301);
        });

        it('returns 404 when deleting missing student', async () => {
            mockService.deleteStudent.mockResolvedValue(null);

            const res = await request(app).delete('/student/302');

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /student/:id', () => {
        it('returns 200 and updated student', async () => {
            const updated = {_id: 401, name: 'Updated Name'};
            mockService.updateStudent.mockResolvedValue(updated);

            const res = await request(app)
                .patch('/student/401')
                .send({name: 'Updated Name'});

            expect(res.status).toBe(200);
            expect(res.body).toEqual(updated);
            expect(mockService.updateStudent).toHaveBeenCalledWith(401, {name: 'Updated Name'});
        });

        it('returns 400 when update body has invalid type', async () => {
            const res = await request(app)
                .patch('/student/401')
                .send({name: 123});

            expect(res.status).toBe(400);
            expect(res.text).toContain('name');
            expect(mockService.updateStudent).not.toHaveBeenCalled();
        });

        it('returns 404 when student to update does not exist', async () => {
            mockService.updateStudent.mockResolvedValue(null);

            const res = await request(app)
                .patch('/student/404')
                .send({password: 'new-safe-pass'});

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /score/student/:id', () => {
        it('returns 204 when score is added', async () => {
            mockService.addScore.mockResolvedValue(true);

            const res = await request(app)
                .patch('/score/student/501')
                .send({examName: 'math', score: 95});

            expect(res.status).toBe(204);
            expect(mockService.addScore).toHaveBeenCalledWith(501, 'math', 95);
        });

        it('returns 404 when student for score is missing', async () => {
            mockService.addScore.mockResolvedValue(false);

            const res = await request(app)
                .patch('/score/student/999')
                .send({examName: 'math', score: 70});

            expect(res.status).toBe(404);
        });

        it('returns 400 when required score field is missing', async () => {
            const res = await request(app)
                .patch('/score/student/501')
                .send({examName: 'math'});

            expect(res.status).toBe(400);
            expect(res.text).toContain('score');
            expect(mockService.addScore).not.toHaveBeenCalled();
        });

        it('returns 400 when score is out of valid range', async () => {
            const res = await request(app)
                .patch('/score/student/501')
                .send({examName: 'math', score: 101});

            expect(res.status).toBe(400);
            expect(res.text).toContain('score');
            expect(mockService.addScore).not.toHaveBeenCalled();
        });
    });

    describe('GET collection endpoints', () => {
        it('GET /students/name/:name returns matched students', async () => {
            const students = [{_id: 601, name: 'Maria'}];
            mockService.findByName.mockResolvedValue(students);

            const res = await request(app).get('/students/name/maria');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(students);
            expect(mockService.findByName).toHaveBeenCalledWith('maria');
        });

        it('GET /quantity/students returns count for query names', async () => {
            mockService.countByNames.mockResolvedValue(2);

            const res = await request(app).get('/quantity/students').query({names: ['Ann', 'Bob']});

            expect(res.status).toBe(200);
            expect(res.body).toBe(2);
            expect(mockService.countByNames).toHaveBeenCalledWith(['Ann', 'Bob']);
        });

        it('GET /students/exam/:exam/minscore/:minScore returns filtered students', async () => {
            const students = [{_id: 602, name: 'John', scores: {math: 88}}];
            mockService.findByMinScore.mockResolvedValue(students);

            const res = await request(app).get('/students/exam/math/minscore/80');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(students);
            expect(mockService.findByMinScore).toHaveBeenCalledWith('math', 80);
        });
    });

    it('returns 500 when service throws and error is propagated by middleware chain', async () => {
        mockService.findStudent.mockRejectedValue(new Error('test failure'));

        const res = await request(app).get('/student/777');

        expect(res.status).toBe(500);
    });
});
