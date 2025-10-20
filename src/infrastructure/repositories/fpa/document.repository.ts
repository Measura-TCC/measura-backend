import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DocumentEntity,
  DocumentEntityDocument,
  DocumentType,
} from '@domain/fpa/entities/document.entity';
import { IDocumentRepository } from '@domain/fpa/interfaces/document.repository.interface';

@Injectable()
export class DocumentRepository implements IDocumentRepository {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntityDocument>,
  ) {}

  async create(document: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const createdDocument = new this.documentModel(document);
    const saved = await createdDocument.save();
    return saved.toObject();
  }

  async findById(id: Types.ObjectId): Promise<DocumentEntity | null> {
    return this.documentModel.findById(id).lean().exec();
  }

  async findByEstimateId(
    estimateId: Types.ObjectId,
  ): Promise<DocumentEntity[]> {
    return this.documentModel.find({ estimateId }).lean().exec();
  }

  async findByType(type: DocumentType): Promise<DocumentEntity[]> {
    return this.documentModel.find({ type }).lean().exec();
  }

  async findByEstimateIdAndType(
    estimateId: Types.ObjectId,
    type: DocumentType,
  ): Promise<DocumentEntity[]> {
    return this.documentModel.find({ estimateId, type }).lean().exec();
  }

  async update(
    id: Types.ObjectId,
    updateData: Partial<DocumentEntity>,
  ): Promise<DocumentEntity | null> {
    return this.documentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean()
      .exec();
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    const result = await this.documentModel.findByIdAndDelete(id).lean().exec();
    return result !== null;
  }

  async deleteByEstimateId(estimateId: Types.ObjectId): Promise<boolean> {
    const result = await this.documentModel.deleteMany({ estimateId }).exec();
    return result.deletedCount > 0;
  }

  async findAll(): Promise<DocumentEntity[]> {
    return this.documentModel.find().lean().exec();
  }

  async countByEstimateId(estimateId: Types.ObjectId): Promise<number> {
    return this.documentModel.countDocuments({ estimateId }).exec();
  }
}
