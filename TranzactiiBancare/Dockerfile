# ============================
# 🏗️ STAGE 1: Build
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiem tot conținutul soluției (inclusiv proiectele din subfoldere)
COPY .. .

# Restaurăm pachetele pentru soluție
RUN dotnet restore "TranzactiiBancareSolution/TranzactiiBancare.sln"

# Compilăm și publicăm aplicația în mod Release
RUN dotnet publish "TranzactiiBancareSolution/TranzactiiBancare/TranzactiiBancare.csproj" -c Release -o /app/publish

# ============================
# 🚀 STAGE 2: Runtime
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render rulează de obicei pe portul 10000
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "TranzactiiBancare.dll"]
