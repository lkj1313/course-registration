import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DayOfWeek, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  COURSE_NAME_PARTS,
  DAY_SEQUENCE,
  DEPARTMENT_CODES,
  DEPARTMENT_NAMES,
  FIRST_NAME_SYLLABLES,
  LAST_NAMES,
} from './seed-data';

type DepartmentRecord = {
  id: number;
  name: string;
};

type ProfessorRecord = {
  id: number;
  departmentId: number;
};

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);
  private readonly studentBatchSize = 1000;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  private async seedIfEmpty() {
    const studentCount = await this.prisma.student.count();

    if (studentCount > 0) {
      this.logger.log('Seed skipped: database already contains students.');
      return;
    }

    this.logger.log('Seed started.');

    const semesterId = await this.seedSemester();
    const departments = await this.seedDepartments();
    await this.seedProfessors(departments);
    await this.seedStudents(departments);
    await this.seedCoursesAndSchedules(departments, semesterId);

    this.logger.log('Seed completed.');
  }

  private async seedSemester() {
    const semester = await this.prisma.semester.upsert({
      where: { year_term: { year: 2026, term: 1 } },
      update: { status: SemesterStatus.ACTIVE },
      create: {
        year: 2026,
        term: 1,
        name: '2026-1',
        status: SemesterStatus.ACTIVE,
      },
    });

    return semester.id;
  }

  private async seedDepartments() {
    await this.prisma.department.createMany({
      data: DEPARTMENT_NAMES.map((name) => ({ name })),
      skipDuplicates: true,
    });

    return this.prisma.department.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
  }

  private async seedProfessors(departments: DepartmentRecord[]) {
    const professorRows = departments.flatMap((department, departmentIndex) =>
      Array.from({ length: 12 }, (_, professorIndex) => ({
        name: this.buildPersonName(departmentIndex * 12 + professorIndex),
        departmentId: department.id,
      })),
    );

    await this.prisma.professor.createMany({
      data: professorRows,
      skipDuplicates: false,
    });
  }

  private async seedStudents(departments: DepartmentRecord[]) {
    let globalIndex = 0;

    for (const department of departments) {
      const studentRows = Array.from({ length: 1000 }, () => {
        const index = globalIndex++;

        return {
          studentNumber: `2026${String(index + 1).padStart(6, '0')}`,
          name: this.buildPersonName(index + 500),
          departmentId: department.id,
        };
      });

      for (let start = 0; start < studentRows.length; start += this.studentBatchSize) {
        await this.prisma.student.createMany({
          data: studentRows.slice(start, start + this.studentBatchSize),
        });
      }
    }
  }

  private async seedCoursesAndSchedules(
    departments: DepartmentRecord[],
    semesterId: number,
  ) {
    const professors = await this.prisma.professor.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, departmentId: true },
    });

    const professorsByDepartment = this.groupProfessorsByDepartment(professors);
    const courseRows = departments.flatMap((department, departmentIndex) =>
      Array.from({ length: 52 }, (_, courseIndex) => {
        const departmentProfessors =
          professorsByDepartment.get(department.id) ?? [];
        const professor =
          departmentProfessors[courseIndex % departmentProfessors.length];
        const sequence = courseIndex + 1;

        return {
          code: `${DEPARTMENT_CODES[departmentIndex]}${String(sequence).padStart(3, '0')}`,
          name: this.buildCourseName(departmentIndex, courseIndex),
          credits: courseIndex % 10 === 0 ? 1 : courseIndex % 4 === 0 ? 2 : 3,
          capacity: 20 + ((departmentIndex * 7 + courseIndex * 3) % 41),
          departmentId: department.id,
          professorId: professor.id,
          semesterId,
        };
      }),
    );

    await this.prisma.course.createMany({
      data: courseRows,
    });

    const courses = await this.prisma.course.findMany({
      where: { semesterId },
      orderBy: { id: 'asc' },
      select: { id: true, code: true },
    });

    const scheduleRows = courses.map((course, index) => {
      const day = DAY_SEQUENCE[index % DAY_SEQUENCE.length] as DayOfWeek;
      const startPeriod = (index % 7) + 1;

      return {
        courseId: course.id,
        dayOfWeek: day,
        startPeriod,
        endPeriod: startPeriod + 1,
      };
    });

    await this.prisma.courseSchedule.createMany({
      data: scheduleRows,
    });
  }

  private groupProfessorsByDepartment(professors: ProfessorRecord[]) {
    const grouped = new Map<number, ProfessorRecord[]>();

    for (const professor of professors) {
      const current = grouped.get(professor.departmentId) ?? [];
      current.push(professor);
      grouped.set(professor.departmentId, current);
    }

    return grouped;
  }

  private buildPersonName(index: number) {
    const lastName = LAST_NAMES[index % LAST_NAMES.length];
    const first = FIRST_NAME_SYLLABLES[index % FIRST_NAME_SYLLABLES.length];
    const second =
      FIRST_NAME_SYLLABLES[
        Math.floor(index / LAST_NAMES.length) % FIRST_NAME_SYLLABLES.length
      ];

    return `${lastName}${first}${second}`;
  }

  private buildCourseName(departmentIndex: number, courseIndex: number) {
    const first = COURSE_NAME_PARTS[
      (departmentIndex + courseIndex) % COURSE_NAME_PARTS.length
    ];
    const second = COURSE_NAME_PARTS[
      (departmentIndex * 3 + courseIndex + 7) % COURSE_NAME_PARTS.length
    ];

    return first === second ? first : `${first} ${second}`;
  }
}
