# ============================
# 🏗️ STAGE 1: Build backend + frontend (.NET + Node)
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 🔹 Instalăm Node.js 20 (LTS)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @angular/cli && \
    node -v && npm -v

# Copiem tot codul
COPY . .

# 1️⃣ Restore backend
RUN dotnet restore "TranzactiiBancare.sln"

# 2️⃣ Build + publish backend
RUN dotnet publish "TranzactiiBancare/TranzactiiBancare.csproj" -c Release -o /app/publish

# 3️⃣ Build frontend Angular
WORKDIR /src/FinantePLFullStack
RUN npm install
RUN npm run build -- --configuration production

# ============================
# 🚀 STAGE 2: Runtime (ASP.NET + Angular)
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copiem backendul publicat
COPY --from=build /app/publish .

# ⚠️ Curățăm orice rămășițe vechi din wwwroot
RUN rm -rf /app/wwwroot/*

# ✅ Copiem DOAR conținutul din dist/.../browser în wwwroot/app
COPY --from=build /src/FinantePLFullStack/dist/FinantePLFullStack/browser/ /app/wwwroot/app/

# Configurăm portul Render
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "TranzactiiBancare.dll"]

