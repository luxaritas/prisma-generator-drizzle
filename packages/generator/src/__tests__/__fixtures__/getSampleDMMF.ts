import { getDMMF, getSchema } from '@prisma/internals'
import path from 'path'

const samplePrismaSchema = getSchema(path.join(__dirname, './sample.prisma'))

export const getSampleDMMF = async () => {
  return getDMMF({
    datamodel: await samplePrismaSchema,
  })
}
