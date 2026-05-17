import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateSlug } from '../common/utils/slug.util';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { Tag, TagDocument } from './schemas/tag.schema';

@Injectable()
export class TagsService {
  constructor(@InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>) {}

  async create(dto: CreateTagDto) {
    const slug = generateSlug(dto.name);
    const existing = await this.tagModel.findOne({
      $or: [{ slug }, { name: new RegExp(`^${dto.name}$`, 'i') }],
    });
    if (existing) {
      throw new ConflictException('Tag already exists');
    }

    return this.tagModel.create({ ...dto, slug });
  }

  async list() {
    return this.tagModel.find().sort({ name: 1 }).exec();
  }

  async findById(id: string) {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  async update(id: string, dto: UpdateTagDto) {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (dto.name) {
      tag.name = dto.name;
      tag.slug = generateSlug(dto.name);
    }
    if (dto.description !== undefined) tag.description = dto.description;
    if (dto.color !== undefined) tag.color = dto.color;
    await tag.save();
    return tag;
  }

  async remove(id: string) {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    if (tag.blogCount > 0) {
      throw new UnprocessableEntityException('Cannot delete tag with assigned blogs');
    }
    await tag.deleteOne();
    return { message: 'Tag deleted' };
  }
}
