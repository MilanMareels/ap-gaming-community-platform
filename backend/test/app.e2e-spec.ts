import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { describe, beforeEach, it } from 'node:test';

describe('AppController (e2e)', () => {
  it('/ (GET)', () => {});
});
