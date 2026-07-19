FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY AITasker.Domain/AITasker.Domain.csproj AITasker.Domain/
COPY AITasker.Application/AITasker.Application.csproj AITasker.Application/
COPY AITasker.Infrastructure/AITasker.Infrastructure.csproj AITasker.Infrastructure/
COPY AITasker.Api/AITasker.Api.csproj AITasker.Api/

RUN dotnet restore AITasker.Api/AITasker.Api.csproj

COPY . .

RUN dotnet publish AITasker.Api/AITasker.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false

EXPOSE 10000

ENTRYPOINT ["dotnet", "AITasker.Api.dll"]