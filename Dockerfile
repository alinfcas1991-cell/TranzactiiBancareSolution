# ============================
# 🏗️ STAGE 1: Build backend + frontend
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiem totul
COPY . .

# 1️⃣ Restore backend
RUN dotnet restore "TranzactiiBancare.sln"

# 2️⃣ Build + publish backend
RUN dotnet publish "TranzactiiBancare/TranzactiiBancare.csproj" -c Release -o /app/publish

# 3️⃣ Build frontend Angular
WORKDIR /src/FinantePLFulLStack
RUN npm install
RUN npm run build -- --configuration production

# ============================
# 🚀 STAGE 2: Runtime (ASP.NET + Angular)
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copiem backendul publicat
COPY --from=build /app/publish .

# Copiem frontend-ul în wwwroot/app
COPY --from=build /src/FinantePLFulLStack/dist /app/wwwroot/app

# Setăm portul folosit de Render
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "TranzactiiBancare.dll"]
