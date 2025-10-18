# ============================
# 🏗️ STAGE 1: Build
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiem tot conținutul soluției
COPY . .

# Restaurăm pachetele pentru soluție
RUN dotnet restore "TranzactiiBancare.sln"

# Compilăm și publicăm aplicația în mod Release
RUN dotnet publish "TranzactiiBancare.csproj" -c Release -o /app/publish

# ============================
# 🚀 STAGE 2: Runtime
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Portul implicit pentru Render (poate fi și 8080)
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "TranzactiiBancare.dll"]
