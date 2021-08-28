import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cat } from './cats.schema'
import { Model } from 'mongoose'
import { CatRequestDto } from './dto/cats.request.dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private readonly catModel: Model<Cat>) {
  }

  async signUp(dto: CatRequestDto) {
    const { email, name, password } = dto
    const isExists = await this.catModel.exists({ email })

    if (isExists) {
      throw new BadRequestException('이미 야옹이가 가입되어 있어요.')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const cat = await this.catModel.create({
      email,
      name,
      password: hashedPassword
    })

    return cat.readOnlyData
  }
}
