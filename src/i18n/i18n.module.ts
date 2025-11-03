import { Module } from '@nestjs/common';
import { I18nModule, QueryResolver, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(process.cwd(), 'dist/i18n/translations/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['locale'] }, // Read from ?locale=pt query param
        AcceptLanguageResolver, // Fallback to Accept-Language header
      ],
    }),
  ],
})
export class I18nConfigModule {}
