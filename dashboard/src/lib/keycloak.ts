import Keycloak from "keycloak-js"
import { appConfig } from "@/lib/config"

const keycloak = new Keycloak({
  url: appConfig.keycloakUrl,
  realm: appConfig.keycloakRealm,
  clientId: appConfig.keycloakClientId,
})

export default keycloak
